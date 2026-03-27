from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timedelta

from app.core.firebase import get_current_user
from app.core.database import get_db
from app.models.schemas import BucketListCreate, BucketListUpdate

router = APIRouter()

@router.get("/readiness")
async def get_festival_readiness(user: dict = Depends(get_current_user)):
    """Calculates exactly how much the user spent on unnecessary things recently to compare against bucket list goals."""
    db = get_db()
    uid = user["_id"]
    now = datetime.utcnow()
    three_months_ago = now - timedelta(days=90)
    
    # Sum over unnecessary categories
    pipeline = [
        {"$match": {"userId": uid, "date": {"$gte": three_months_ago}, "category": {"$in": ["Shopping", "Entertainment", "Other"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    agg_res = await db.expenses.aggregate(pipeline).to_list(1)
    unnecessary_spent = agg_res[0]["total"] if agg_res else 0
    
    return {"success": True, "data": {"unnecessary_spent_90_days": unnecessary_spent}}

@router.get("/")
async def get_bucket_list(user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.bucket_list.find({"userId": user["_id"]}).sort("createdAt", -1).to_list(100)
    for item in items:
        item["_id"] = str(item["_id"])
    return {"success": True, "data": items}

@router.post("/")
async def add_bucket_item(item: BucketListCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    
    new_item = {
        "userId": user["_id"],
        "title": item.title,
        "targetAmount": item.targetAmount,
        "category": item.category,
        "isFulfilled": False,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.bucket_list.insert_one(new_item)
    new_item["_id"] = str(result.inserted_id)
    return {"success": True, "data": new_item}

@router.patch("/{item_id}")
async def update_bucket_item(item_id: str, updates: BucketListUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        obj_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    result = await db.bucket_list.update_one(
        {"_id": obj_id, "userId": user["_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
        
    updated_item = await db.bucket_list.find_one({"_id": obj_id})
    updated_item["_id"] = str(updated_item["_id"])
    return {"success": True, "data": updated_item}

@router.delete("/{item_id}")
async def delete_bucket_item(item_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        obj_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = await db.bucket_list.delete_one({"_id": obj_id, "userId": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
        
    return {"success": True, "data": {"deletedId": str(item_id)}}
