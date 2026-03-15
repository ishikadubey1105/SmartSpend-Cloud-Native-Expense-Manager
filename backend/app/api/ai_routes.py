from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from app.services.ai import parse_receipt_image, chat_with_rag, run_anomaly_detection

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    user_id: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/scan-receipt")
async def scan_receipt(
    user_id: str = Form(...),
    receipt: UploadFile = File(...)
):
    """
    Receives an image, runs it through OCR/Vision LLM, and returns the parsed data.
    """
    try:
        contents = await receipt.read()
        extracted_data = await parse_receipt_image(contents)
        
        # Here we could automatically insert into database, or just return to UI for confirmation
        return {
            "status": "success",
            "data": extracted_data.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Accepts a user query, performs RAG over their expenses, and generates a personalized response.
    """
    reply = await chat_with_rag(request.query, request.user_id)
    return ChatResponse(reply=reply)

@router.get("/metrics/anomalies/{user_id}")
async def check_anomalies(user_id: str):
    """
    Endpoint to trigger or retrieve anomaly reports for the dashboard.
    """
    result = await run_anomaly_detection(user_id)
    if not result:
        return {"status": "no_anomalies"}
    return {
        "status": "anomaly_detected",
        "anomaly": result
    }
