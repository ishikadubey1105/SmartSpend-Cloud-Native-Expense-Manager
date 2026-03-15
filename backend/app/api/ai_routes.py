"""
AI Insights API routes — insights, categorize, scan-receipt, chat, command.
Full parity with Node.js insightsController + new chat endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.core.firebase import get_current_user
from app.core.database import get_db
from app.models.schemas import ChatRequest, CategorizeRequest, ReceiptScanRequest, CommandRequest
from app.services.ai import (
    generate_insights, categorize_expense, scan_receipt,
    chat_with_context, call_gemini,
)

router = APIRouter()


# ── GET /api/insights ─────────────────────────────────────────────────────────
@router.get("/")
async def get_insights(user: dict = Depends(get_current_user)):
    db = get_db()
    uid = user["_id"]
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    end = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
    monthly_budget = user.get("monthlyBudget", 0)

    # Fetch data
    expenses = await db.expenses.find(
        {"userId": uid, "date": {"$gte": start, "$lt": end}}
    ).sort("amount", -1).limit(30).to_list(30)

    budgets = await db.budgets.find({"userId": uid, "month": now.month, "year": now.year}).to_list(20)

    cat_pipeline = [
        {"$match": {"userId": uid, "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    cat_stats = await db.expenses.aggregate(cat_pipeline).to_list(20)

    if not expenses:
        return {"success": True, "data": {"insights": "📊 No expenses found this month yet. Add some expenses and come back for AI insights!"}}

    total = sum(e["amount"] for e in expenses)
    day = now.day
    days_total = (end - start).days
    projected = round((total / day) * days_total) if day > 0 else 0
    top_cat = cat_stats[0]["_id"] if cat_stats else "N/A"

    budget_status = "\n".join(
        f"{b['category']}: ₹{next((c['total'] for c in cat_stats if c['_id'] == b['category']), 0):.0f} of ₹{b['limit']} ({round(next((c['total'] for c in cat_stats if c['_id'] == b['category']), 0) / b['limit'] * 100)}%)"
        for b in budgets
    )

    top_exp = "\n".join(f"- ₹{e['amount']} — {e['title']} ({e.get('category', 'Other')})" for e in expenses[:10])
    cat_lines = "\n".join(f"- {c['_id']}: ₹{c['total']:.0f} ({c['count']} txns)" for c in cat_stats)
    month_name = now.strftime("%B %Y")

    insights = await generate_insights(
        total, monthly_budget, day, days_total, projected,
        top_cat, budget_status, top_exp, cat_lines, month_name,
    )

    return {"success": True, "data": {"insights": insights}}


# ── POST /api/insights/categorize ─────────────────────────────────────────────
@router.post("/categorize")
async def categorize(body: CategorizeRequest, user: dict = Depends(get_current_user)):
    category = await categorize_expense(body.title)
    return {"success": True, "data": {"category": category}}


# ── POST /api/insights/scan-receipt ───────────────────────────────────────────
@router.post("/scan-receipt")
async def scan(body: ReceiptScanRequest, user: dict = Depends(get_current_user)):
    try:
        data = await scan_receipt(body.imageFile, body.mimeType)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Receipt scan failed: {str(e)}")


# ── POST /api/insights/chat ──────────────────────────────────────────────────
@router.post("/chat")
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    """Conversational AI chat grounded in user's real spending data."""
    db = get_db()
    uid = user["_id"]
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    end = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)

    # Gather context
    cat_pipeline = [
        {"$match": {"userId": uid, "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    cat_stats = await db.expenses.aggregate(cat_pipeline).to_list(20)
    recent = await db.expenses.find({"userId": uid}).sort("date", -1).limit(15).to_list(15)
    budgets = await db.budgets.find({"userId": uid, "month": now.month, "year": now.year}).to_list(20)

    total = sum(c["total"] for c in cat_stats)
    monthly_budget = user.get("monthlyBudget", 0)
    day = now.day
    days_total = (end - start).days
    projected = round((total / day) * days_total) if day > 0 else 0

    budget_status = ", ".join(
        f"{b['category']}: ₹{next((c['total'] for c in cat_stats if c['_id'] == b['category']), 0):.0f} of ₹{b['limit']}"
        for b in budgets
    ) or "No budgets set"

    cat_lines = "\n".join(f"- {c['_id']}: ₹{c['total']:.0f} ({c['count']} txns)" for c in cat_stats)
    exp_lines = "\n".join(
        f"- ₹{e['amount']} — {e['title']} ({e.get('category', 'Other')}, {e['date'].strftime('%d %b %Y') if isinstance(e.get('date'), datetime) else 'N/A'})"
        for e in recent[:10]
    )

    reply = await chat_with_context(
        body.query, total, monthly_budget, day, days_total, projected,
        budget_status, cat_lines, exp_lines, now.strftime("%B %Y"),
    )
    return {"success": True, "reply": reply}


# ── POST /api/insights/command ─────────────────────────────────────────────
@router.post("/command")
async def process_command(body: CommandRequest, user: dict = Depends(get_current_user)):
    from app.models.schemas import VALID_CATEGORIES
    import json

    prompt = f"""You are the Omni-Search AI for a finance app. User input: "{body.query}"

Determine the precise intent:
- NAVIGATE: go to a page (dashboard, expenses, analytics, budgets, insights, settings, subscriptions)
- ADD_EXPENSE: log a transaction (e.g. "spent 500 on swiggy")
- UNKNOWN: anything else

Return ONLY raw JSON (no markdown) with:
{{"intent": "NAVIGATE"|"ADD_EXPENSE"|"UNKNOWN", "path": "/page_name", "expense": {{"title": "Store", "amount": 100, "category": "Food"}}}}"""

    try:
        result = await call_gemini(prompt, temperature=0.1, max_tokens=200)
        clean = result.replace("```json", "").replace("```", "").strip()
        return {"success": True, "data": json.loads(clean)}
    except Exception:
        return {"success": True, "data": {"intent": "UNKNOWN"}}
