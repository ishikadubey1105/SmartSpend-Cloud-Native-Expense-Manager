from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ExpenseBase(BaseModel):
    title: str
    amount: float
    category: str
    date: datetime = Field(default_factory=datetime.utcnow)
    merchant: Optional[str] = None
    notes: Optional[str] = None
    user_id: str

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[datetime] = None
    merchant: Optional[str] = None
    notes: Optional[str] = None
