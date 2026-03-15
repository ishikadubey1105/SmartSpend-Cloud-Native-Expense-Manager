"""
Expense CRUD API routes.
Full parity with Node.js server: list, get, create, update, delete, bulk-delete, anomalies.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional, List
import numpy as np

from app.core.firebase import get_current_user
from app.core.database import get_db
from app.models.schemas import ExpenseCreate, ExpenseUpdate

router = APIRouter()


def serialize(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-serializable dict."""
    doc["_id"] = str(doc["_id"])
    if "userId" in doc:
        doc["userId"] = str(doc["userId"])
    return doc


# ── GET /api/expenses ─────────────────────────────────────────────────────────
@router.get("/")
async def list_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    paymentMethod: Optional[str] = None,
    search: Optional[str] = None,
    sortBy: str = "date",
    sortOrder: str = "desc",
    isRecurring: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {"userId": user["_id"]}

    if category:
        query["category"] = category
    if paymentMethod:
        query["paymentMethod"] = paymentMethod
    if isRecurring is not None:
        query["isRecurring"] = isRecurring == "true"
    if startDate or endDate:
        query["date"] = {}
        if startDate:
            query["date"]["$gte"] = datetime.fromisoformat(startDate)
        if endDate:
            query["date"]["$lte"] = datetime.fromisoformat(endDate)
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]

    sort_dir = 1 if sortOrder == "asc" else -1
    skip = (page - 1) * limit

    cursor = db.expenses.find(query).sort(sortBy, sort_dir).skip(skip).limit(limit)
    expenses = [serialize(doc) async for doc in cursor]
    total = await db.expenses.count_documents(query)

    return {
        "success": True,
        "data": expenses,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": -(-total // limit),  # ceil division
        },
    }


# ── GET /api/expenses/:id ─────────────────────────────────────────────────────
@router.get("/{expense_id}")
async def get_expense(expense_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.expenses.find_one({"_id": ObjectId(expense_id), "userId": user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"success": True, "data": serialize(doc)}


# ── POST /api/expenses ────────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_expense(body: ExpenseCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = body.model_dump()
    doc["userId"] = user["_id"]
    doc["date"] = doc.get("date") or datetime.utcnow()
    doc["createdAt"] = datetime.utcnow()
    doc["updatedAt"] = datetime.utcnow()

    result = await db.expenses.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Check budget alert
    budget_alert = await _check_budget_alert(db, user["_id"], doc["category"], doc["date"])

    return {"success": True, "data": serialize(doc), "budgetAlert": budget_alert}


# ── PUT /api/expenses/:id ─────────────────────────────────────────────────────
@router.put("/{expense_id}")
async def update_expense(expense_id: str, body: ExpenseUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    update["updatedAt"] = datetime.utcnow()
    result = await db.expenses.find_one_and_update(
        {"_id": ObjectId(expense_id), "userId": user["_id"]},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"success": True, "data": serialize(result)}


# ── DELETE /api/expenses/:id ──────────────────────────────────────────────────
@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.expenses.delete_one({"_id": ObjectId(expense_id), "userId": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"success": True, "message": "Expense deleted successfully"}


# ── DELETE /api/expenses/bulk ─────────────────────────────────────────────────
@router.delete("/bulk")
async def bulk_delete(ids: List[str], user: dict = Depends(get_current_user)):
    db = get_db()
    obj_ids = [ObjectId(i) for i in ids]
    result = await db.expenses.delete_many({"_id": {"$in": obj_ids}, "userId": user["_id"]})
    return {"success": True, "message": f"{result.deleted_count} expense(s) deleted"}


# ── GET /api/expenses/anomalies ───────────────────────────────────────────────
@router.get("/anomalies/detect")
async def get_anomalies(user: dict = Depends(get_current_user)):
    """Detect spending anomalies using z-score analysis (2-sigma threshold)."""
    db = get_db()
    uid = user["_id"]
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    three_months_ago = datetime(now.year, now.month - 3 if now.month > 3 else 1, 1)

    # Per-category stats over last 3 months
    pipeline = [
        {"$match": {"userId": uid, "date": {"$gte": three_months_ago}}},
        {"$group": {
            "_id": "$category",
            "mean": {"$avg": "$amount"},
            "stdDev": {"$stdDevPop": "$amount"},
        }},
    ]
    stats_cursor = db.expenses.aggregate(pipeline)
    stats_map = {}
    async for s in stats_cursor:
        stats_map[s["_id"]] = s

    # Current month expenses
    cursor = db.expenses.find({"userId": uid, "date": {"$gte": start_of_month}})
    anomalies = []
    async for e in cursor:
        cat_stats = stats_map.get(e.get("category"))
        if not cat_stats or not cat_stats.get("stdDev") or cat_stats["stdDev"] == 0:
            continue
        z = (e["amount"] - cat_stats["mean"]) / cat_stats["stdDev"]
        if z > 2.0:
            doc = serialize(e)
            doc["zScore"] = round(z, 1)
            doc["categoryMean"] = round(cat_stats["mean"])
            anomalies.append(doc)

    return {"success": True, "data": anomalies}


# ── Helper: Budget Alert ──────────────────────────────────────────────────────
async def _check_budget_alert(db, user_id, category: str, date: datetime):
    month = date.month
    year = date.year
    budget = await db.budgets.find_one({"userId": user_id, "category": category, "month": month, "year": year})
    if not budget:
        return None

    start = datetime(year, month, 1)
    end = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)

    pipeline = [
        {"$match": {"userId": user_id, "category": category, "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    agg = await db.expenses.aggregate(pipeline).to_list(1)
    spent = agg[0]["total"] if agg else 0
    pct = (spent / budget["limit"]) * 100

    if pct >= 100:
        return {"type": "exceeded", "message": f"🚨 Budget exceeded for {category}! ₹{spent:.0f} of ₹{budget['limit']}", "percentage": pct}
    if pct >= budget.get("alertThreshold", 80):
        return {"type": "warning", "message": f"⚠️ {pct:.0f}% of {category} budget used", "percentage": pct}
    return None
