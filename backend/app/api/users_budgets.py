"""
Budget and User API routes.
"""

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.core.firebase import get_current_user
from app.core.database import get_db
from app.models.schemas import BudgetUpsert, UserUpdate

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# USER ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/users/sync")
async def sync_user(user: dict = Depends(get_current_user)):
    """Sync user from Firebase — the auth middleware already creates if missing."""
    safe = {k: v for k, v in user.items() if k != "_id"}
    safe["_id"] = str(user["_id"])
    return {"success": True, "data": safe}


@router.get("/users/me")
async def get_profile(user: dict = Depends(get_current_user)):
    safe = {k: v for k, v in user.items() if k != "_id"}
    safe["_id"] = str(user["_id"])
    return {"success": True, "data": safe}


@router.put("/users/me")
async def update_profile(body: UserUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    update["updatedAt"] = datetime.utcnow()
    result = await db.users.find_one_and_update(
        {"_id": user["_id"]},
        {"$set": update},
        return_document=True,
    )
    safe = {k: v for k, v in result.items() if k != "_id"}
    safe["_id"] = str(result["_id"])
    return {"success": True, "data": safe}


# ══════════════════════════════════════════════════════════════════════════════
# BUDGET ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/budgets")
async def list_budgets(
    month: int = None,
    year: int = None,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year

    cursor = db.budgets.find({"userId": user["_id"], "month": m, "year": y})
    budgets = []
    async for b in cursor:
        b["_id"] = str(b["_id"])
        b["userId"] = str(b["userId"])
        budgets.append(b)

    return {"success": True, "data": budgets}


@router.post("/budgets")
async def upsert_budget(body: BudgetUpsert, user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.utcnow()
    month, year = now.month, now.year

    result = await db.budgets.find_one_and_update(
        {"userId": user["_id"], "category": body.category, "month": month, "year": year},
        {"$set": {
            "userId": user["_id"],
            "category": body.category,
            "limit": body.limit,
            "alertThreshold": body.alertThreshold,
            "month": month,
            "year": year,
            "updatedAt": now,
        }, "$setOnInsert": {"createdAt": now}},
        upsert=True,
        return_document=True,
    )
    result["_id"] = str(result["_id"])
    result["userId"] = str(result["userId"])
    return {"success": True, "data": result}


@router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.budgets.delete_one({"_id": ObjectId(budget_id), "userId": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"success": True, "message": "Budget deleted"}
