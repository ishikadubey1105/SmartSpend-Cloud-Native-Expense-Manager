from fastapi import APIRouter, HTTPException, Path, Depends
from typing import List
from app.models.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.core.firebase import get_db

router = APIRouter()

# Note: In a real environment, you'd extract 'user_id' from a dependency injecting Firebase Auth tokens.
# For demonstration and local testing, we rely on the user_id passed in the payload or path.

@router.post("/", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate):
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    # Convert datetime to string or firestore native timestamp
    expense_data = expense.model_dump()
    expense_data["date"] = expense_data["date"].isoformat()
    
    # Store expense under the user's collection
    _, doc_ref = db.collection("users").document(expense.user_id).collection("expenses").add(expense_data)
    
    return ExpenseResponse(id=doc_ref.id, **expense_data)

@router.get("/{user_id}", response_model=List[ExpenseResponse])
async def list_expenses(user_id: str):
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    docs = db.collection("users").document(user_id).collection("expenses").stream()
    expenses = []
    
    for doc in docs:
        expense_dict = doc.to_dict()
        expenses.append(ExpenseResponse(id=doc.id, **expense_dict))
        
    return expenses

@router.get("/{user_id}/{expense_id}", response_model=ExpenseResponse)
async def get_expense(user_id: str, expense_id: str = Path(...)):
    db = get_db()
    
    doc_ref = db.collection("users").document(user_id).collection("expenses").document(expense_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    return ExpenseResponse(id=doc.id, **doc.to_dict())

@router.delete("/{user_id}/{expense_id}")
async def delete_expense(user_id: str, expense_id: str = Path(...)):
    db = get_db()
    doc_ref = db.collection("users").document(user_id).collection("expenses").document(expense_id)
    doc_ref.delete()
    return {"message": "Expense deleted successfully"}
