"""
Pydantic models for Expenses, Users, Budgets, and AI features.
Matches the MongoDB schema used by the existing Node.js server.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


# ── Categories & Payment Methods ──────────────────────────────────────────────
VALID_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Health", "Education", "Entertainment", "Other"]
VALID_PAYMENT_METHODS = ["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking", "Wallet", "Other"]


class CategoryEnum(str, Enum):
    Food = "Food"
    Transport = "Transport"
    Shopping = "Shopping"
    Bills = "Bills"
    Health = "Health"
    Education = "Education"
    Entertainment = "Entertainment"
    Other = "Other"


# ── Expense Models ────────────────────────────────────────────────────────────
class ExpenseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)
    category: CategoryEnum
    description: Optional[str] = Field(default="", max_length=500)
    date: Optional[datetime] = None
    paymentMethod: Optional[str] = "Cash"
    isRecurring: Optional[bool] = False
    recurringInterval: Optional[Literal["daily", "weekly", "monthly", "yearly"]] = None
    tags: Optional[List[str]] = Field(default_factory=list, max_length=10)


class ExpenseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[CategoryEnum] = None
    description: Optional[str] = Field(None, max_length=500)
    date: Optional[datetime] = None
    paymentMethod: Optional[str] = None
    isRecurring: Optional[bool] = None
    recurringInterval: Optional[Literal["daily", "weekly", "monthly", "yearly"]] = None
    tags: Optional[List[str]] = None


# ── Budget Models ─────────────────────────────────────────────────────────────
class BudgetUpsert(BaseModel):
    category: CategoryEnum
    limit: float = Field(..., ge=1)
    alertThreshold: Optional[int] = Field(default=80, ge=50, le=100)


# ── User Models ───────────────────────────────────────────────────────────────
class UserUpdate(BaseModel):
    displayName: Optional[str] = None
    monthlyBudget: Optional[float] = None
    currency: Optional[Literal["INR", "USD", "EUR", "GBP"]] = None
    language: Optional[Literal["en", "hi"]] = None
    age: Optional[int] = None
    gender: Optional[str] = None


# ── AI / Insights Models ─────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)


class CategorizeRequest(BaseModel):
    title: str = Field(..., min_length=1)


class ReceiptScanRequest(BaseModel):
    imageFile: str   # base64 encoded image
    mimeType: Optional[str] = "image/jpeg"


class CommandRequest(BaseModel):
    query: str = Field(..., min_length=1)

# ── Bucket List Models ────────────────────────────────────────────────────────
class BucketListCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    targetAmount: float = Field(..., gt=0)
    category: Optional[str] = "Festival"

class BucketListUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    targetAmount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    isFulfilled: Optional[bool] = None
