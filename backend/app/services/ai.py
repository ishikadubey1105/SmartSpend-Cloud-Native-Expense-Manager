import os
from openai import AsyncOpenAI
from google import genai
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.core.config import settings

# Initialize OpenAI client (for Chat/RAG) if key is set
oai_client = None
if settings.OPENAI_API_KEY:
    oai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Initialize Gemini Client (Best for Vision/OCR usually)
# Requires GOOGLE_API_KEY in env
gemini_client = None
if os.getenv("GOOGLE_API_KEY"):
    gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

class ExtractedExpense(BaseModel):
    title: str
    amount: float
    category: str
    merchant: Optional[str] = None
    date: Optional[str] = None

async def parse_receipt_image(image_bytes: bytes) -> ExtractedExpense:
    """
    Simulates sending an image to Gemini Vision API to extract expense data.
    """
    if not gemini_client:
        # Fallback dummy implementation for dev without keys
        print("MOCK OCR Parse - No Gemini API Key")
        return ExtractedExpense(
            title="Dinner at Taj",
            amount=4500.0,
            category="Dining",
            merchant="Taj Hotels",
            date="2026-03-09"
        )
        
    # Real implementation would look like:
    # response = gemini_client.models.generate_content(
    #     model='gemini-2.5-pro',
    #     contents=[
    #         'Extract merchant, total amount, date, and categorize this expense. Return strictly as JSON.',
    #         image_bytes
    #     ]
    # )
    # # parse JSON from response.text and return ExtractedExpense
    pass

async def chat_with_rag(query: str, user_id: str) -> str:
    """
    Simulates a RAG pipeline query:
    1. Embeds `query`
    2. Searches Pinecone/Vector DB for relevant past expenses
    3. Injects context into ChatGPT system prompt
    4. Returns highly personalized financial advice.
    """
    if not oai_client:
        print("MOCK RAG Chat - No OpenAI API Key")
        return "You're spending 30% more on food this week! Based on your history, I recommend cutting back on Zomato orders to stay within your ₹10,000 monthly dining budget."
    
    # Real RAG implementation would retrieve user's specific expense history documents
    context = "" # fetch from vector db
    
    response = await oai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"You are SmartSpend, a specialized Indian financial advisor. Here is the user's spending context: {context}"},
            {"role": "user", "content": query}
        ]
    )
    return response.choices[0].message.content

async def run_anomaly_detection(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Scans a user's recent expenses for statistical anomalies.
    Returns None if no anomaly, or a dict describing the anomaly.
    """
    # MOCK implementation
    # Real logic would fetch last 30 days from Firestore, group by category, and compare z-scores
    return {
        "category": "Entertainment",
        "message": "Unusual Spike Detected",
        "description": "You've spent ₹8,000 on entertainment this weekend, which is 200% higher than your usual weekend average."
    }
