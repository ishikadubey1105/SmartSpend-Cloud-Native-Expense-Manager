"""
Gemini AI service — handles all AI features:
  - Financial insights generation
  - Expense categorization
  - Receipt OCR scanning
  - Conversational chat with financial context
  - Command/intent parsing
"""

import os
import json
import httpx
from typing import Optional
from app.core.config import get_settings


GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


async def call_gemini(prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> str:
    """Send a text prompt to Gemini and return the generated text."""
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY

    if not api_key:
        return "⚠️ Gemini API key not configured. Add GEMINI_API_KEY to .env"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{GEMINI_URL}?key={api_key}",
            json=payload,
            headers={"Content-Type": "application/json"},
        )

    if resp.status_code != 200:
        return f"AI request failed (HTTP {resp.status_code})"

    data = resp.json()
    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    return text or "AI insights unavailable."


async def call_gemini_vision(prompt: str, base64_image: str, mime_type: str = "image/jpeg") -> str:
    """Send text + image to Gemini Vision for receipt OCR."""
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY

    if not api_key:
        raise ValueError("Gemini API key not configured")

    # Strip data URI prefix if present
    clean_b64 = base64_image.split(",")[-1] if "," in base64_image else base64_image

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inlineData": {"mimeType": mime_type, "data": clean_b64}},
            ]
        }],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300},
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(
            f"{GEMINI_URL}?key={api_key}",
            json=payload,
            headers={"Content-Type": "application/json"},
        )

    data = resp.json()
    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
    return text


async def categorize_expense(title: str) -> str:
    """Use Gemini to suggest a category for an expense title."""
    from app.models.schemas import VALID_CATEGORIES

    prompt = f"""Given this expense title: "{title}"
    
Suggest the most appropriate category from ONLY this list:
{', '.join(VALID_CATEGORIES)}

Respond with ONLY the exact category name, nothing else."""

    result = await call_gemini(prompt, temperature=0.1, max_tokens=20)
    # Find matching category
    for cat in VALID_CATEGORIES:
        if cat.lower() in result.strip().lower():
            return cat
    return "Other"


async def scan_receipt(base64_image: str, mime_type: str = "image/jpeg") -> dict:
    """Use Gemini Vision to extract expense data from a receipt image."""
    from app.models.schemas import VALID_CATEGORIES

    prompt = f"""Analyze this checkout receipt. Extract the following 4 pieces of information exactly as JSON keys:
- "title" (the name of the store or merchant)
- "amount" (the final total amount paid as a clean number)
- "date" (the date of the transaction in YYYY-MM-DD format if visible, else null)
- "category" (pick from: [{', '.join(f'"{c}"' for c in VALID_CATEGORIES)}]. Default "Other".)

Return ONLY valid raw JSON with those 4 keys. No markdown code blocks."""

    raw = await call_gemini_vision(prompt, base64_image, mime_type)
    clean = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        raise ValueError(f"Failed to parse receipt data: {clean[:200]}")


async def generate_insights(
    total_spent: float,
    monthly_budget: float,
    day_of_month: int,
    days_in_month: int,
    projected_spend: float,
    top_category: str,
    budget_status: str,
    top_expenses: str,
    category_breakdown: str,
    month_name: str,
) -> str:
    """Generate comprehensive AI financial insights from user's spending data."""
    prompt = f"""You are SmartSpend AI — a brilliant, warm personal finance advisor. Analyze this user's expenses and give genuinely useful, specific insights.

## User's Financial Snapshot
- **Month:** {month_name}
- **Total spent so far:** ₹{total_spent:,.0f}
- **Day of month:** {day_of_month} of {days_in_month}
- **Projected month-end spend:** ₹{projected_spend:,.0f}
- **Overall monthly budget:** ₹{monthly_budget:,.0f} {'(not set)' if monthly_budget <= 0 else ''}
- **Top spending category:** {top_category}

## Category Budgets:
{budget_status or 'No budgets set'}

## Top Expenses This Month:
{top_expenses}

## Category Breakdown:
{category_breakdown}

Please provide these 4 sections in markdown:

### 📊 Spending Pattern
A 2-3 line analysis specific to THIS user's data. Mention actual numbers and categories.

### 💡 Top Savings Tip
One specific, actionable insight based on their biggest expense or pattern.

### 🚨 Budget Alert
Mention any category close to or over budget. If all good, say so.

### 🔮 Month-End Prediction
Based on the pace (₹{projected_spend:,.0f} projected), what should they expect?

Be specific to this person's numbers. Use ₹ symbol. Keep each section to 2-3 lines max."""

    return await call_gemini(prompt)


async def chat_with_context(
    query: str,
    total_spent: float,
    monthly_budget: float,
    day_of_month: int,
    days_in_month: int,
    projected: int,
    budget_status: str,
    category_lines: str,
    expense_lines: str,
    month_name: str,
) -> str:
    """Conversational AI chat grounded in the user's real financial data."""
    prompt = f"""You are SmartSpend AI — a brilliant, friendly personal finance advisor. The user has asked: "{query}"

## User's Current Financial Context
- **Month:** {month_name}
- **Total spent this month:** ₹{total_spent:,.0f}
- **Monthly budget:** ₹{monthly_budget:,.0f} {'(not set)' if monthly_budget <= 0 else ''}
- **Day {day_of_month} of {days_in_month}** — Projected month-end: ₹{projected:,}
- **Budget status:** {budget_status}

## Category Spending This Month:
{category_lines or 'No expenses yet'}

## Recent Transactions:
{expense_lines or 'None'}

Answer the user's question specifically based on their real data above. Be conversational, helpful, and use ₹ symbol. Keep your response concise (3-5 lines) unless the question requires more detail."""

    return await call_gemini(prompt)
