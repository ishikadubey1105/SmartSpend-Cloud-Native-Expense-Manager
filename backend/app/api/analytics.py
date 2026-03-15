"""
Analytics API routes — summary, trends, categories, daily, payment methods, recurring, heatmap.
Full parity with Node.js analyticsController.
"""

from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional

from app.core.firebase import get_current_user
from app.core.database import get_db

router = APIRouter()


# ── GET /api/analytics/summary ────────────────────────────────────────────────
@router.get("/summary")
async def get_summary(user: dict = Depends(get_current_user)):
    db = get_db()
    uid = user["_id"]
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    end_of_month = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
    start_of_day = datetime(now.year, now.month, now.day)
    day_of_month = now.day
    days_in_month = (end_of_month - datetime(now.year, now.month, 1)).days

    pipelines = {
        "totalAll": [{"$match": {"userId": uid}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}],
        "totalMonth": [{"$match": {"userId": uid, "date": {"$gte": start_of_month, "$lt": end_of_month}}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}],
        "totalToday": [{"$match": {"userId": uid, "date": {"$gte": start_of_day}}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}],
        "categories": [
            {"$match": {"userId": uid, "date": {"$gte": start_of_month, "$lt": end_of_month}}},
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
            {"$sort": {"total": -1}},
        ],
        "recurring": [{"$match": {"userId": uid, "isRecurring": True}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}],
    }

    results = {}
    for key, pipeline in pipelines.items():
        results[key] = await db.expenses.aggregate(pipeline).to_list(100)

    recent = await db.expenses.find({"userId": uid}).sort("date", -1).limit(5).to_list(5)
    for r in recent:
        r["_id"] = str(r["_id"])
        if "userId" in r:
            r["userId"] = str(r["userId"])

    month_total = results["totalMonth"][0]["total"] if results["totalMonth"] else 0
    predicted = round((month_total / day_of_month) * days_in_month) if day_of_month > 0 else 0
    monthly_budget = user.get("monthlyBudget", 0)

    return {
        "success": True,
        "data": {
            "totalAllTime": results["totalAll"][0]["total"] if results["totalAll"] else 0,
            "totalExpenses": results["totalAll"][0]["count"] if results["totalAll"] else 0,
            "totalThisMonth": month_total,
            "monthlyCount": results["totalMonth"][0]["count"] if results["totalMonth"] else 0,
            "totalToday": results["totalToday"][0]["total"] if results["totalToday"] else 0,
            "todayCount": results["totalToday"][0]["count"] if results["totalToday"] else 0,
            "predictedMonthEnd": predicted,
            "dayOfMonth": day_of_month,
            "daysInMonth": days_in_month,
            "recurringMonthly": results["recurring"][0]["total"] if results["recurring"] else 0,
            "categoryBreakdown": [{"category": c["_id"], "total": c["total"], "count": c["count"]} for c in results["categories"]],
            "recentExpenses": recent,
            "monthlyBudget": monthly_budget,
            "budgetUsedPercent": (month_total / monthly_budget * 100) if monthly_budget else 0,
        },
    }


# ── GET /api/analytics/trends ─────────────────────────────────────────────────
@router.get("/trends")
async def get_trends(user: dict = Depends(get_current_user)):
    db = get_db()
    uid = user["_id"]
    now = datetime.utcnow()
    twelve_ago = datetime(now.year - 1, now.month, 1)

    pipeline = [
        {"$match": {"userId": uid, "date": {"$gte": twelve_ago}}},
        {"$group": {
            "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
            "avg": {"$avg": "$amount"},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    raw = await db.expenses.aggregate(pipeline).to_list(24)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    formatted = []
    for t in raw:
        formatted.append({
            "label": f"{months[t['_id']['month'] - 1]} {t['_id']['year']}",
            "month": t["_id"]["month"],
            "year": t["_id"]["year"],
            "total": t["total"],
            "count": t["count"],
            "average": round(t["avg"], 2),
        })

    # 3-month rolling average
    for i, item in enumerate(formatted):
        window = formatted[max(0, i - 2):i + 1]
        item["ma3"] = round(sum(w["total"] for w in window) / len(window))

    return {"success": True, "data": formatted}


# ── GET /api/analytics/categories ────────────────────────────────────────────
@router.get("/categories")
async def get_categories(
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    start = datetime(y, m, 1)
    end = datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1)
    uid = user["_id"]

    pipeline = [
        {"$match": {"userId": uid, "date": {"$gte": start, "$lt": end}}},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"}, "count": {"$sum": 1},
            "max": {"$max": "$amount"}, "min": {"$min": "$amount"},
            "avg": {"$avg": "$amount"}, "stdDev": {"$stdDevPop": "$amount"},
        }},
        {"$sort": {"total": -1}},
    ]

    analytics = await db.expenses.aggregate(pipeline).to_list(20)
    budgets = await db.budgets.find({"userId": uid, "month": m, "year": y}).to_list(20)
    budget_map = {b["category"]: b["limit"] for b in budgets}

    enriched = []
    for a in analytics:
        budget_limit = budget_map.get(a["_id"])
        enriched.append({
            "category": a["_id"],
            "total": round(a["total"], 2),
            "count": a["count"],
            "max": a["max"], "min": a["min"],
            "average": round(a["avg"], 2),
            "stdDev": round(a.get("stdDev") or 0, 2),
            "budget": budget_limit,
            "budgetUsed": round(a["total"] / budget_limit * 100) if budget_limit else None,
        })

    return {"success": True, "data": enriched}


# ── GET /api/analytics/daily ──────────────────────────────────────────────────
@router.get("/daily")
async def get_daily(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    end = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)

    pipeline = [
        {"$match": {"userId": user["_id"], "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": {"$dayOfMonth": "$date"}, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    data = await db.expenses.aggregate(pipeline).to_list(31)
    return {"success": True, "data": data}


# ── GET /api/analytics/payment-methods ───────────────────────────────────────
@router.get("/payment-methods")
async def get_payment_methods(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)

    pipeline = [
        {"$match": {"userId": user["_id"], "date": {"$gte": start}}},
        {"$group": {"_id": "$paymentMethod", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    data = await db.expenses.aggregate(pipeline).to_list(10)
    return {"success": True, "data": data}


# ── GET /api/analytics/heatmap ────────────────────────────────────────────────
@router.get("/heatmap")
async def get_heatmap(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.utcnow()
    year_ago = datetime(now.year - 1, now.month, now.day)

    pipeline = [
        {"$match": {"userId": user["_id"], "date": {"$gte": year_ago}}},
        {"$group": {
            "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}, "day": {"$dayOfMonth": "$date"}},
            "total": {"$sum": "$amount"}, "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
    ]
    raw = await db.expenses.aggregate(pipeline).to_list(400)

    formatted = []
    for d in raw:
        date_str = f"{d['_id']['year']}-{d['_id']['month']:02d}-{d['_id']['day']:02d}"
        formatted.append({"date": date_str, "total": round(d["total"]), "count": d["count"]})

    return {"success": True, "data": formatted}
