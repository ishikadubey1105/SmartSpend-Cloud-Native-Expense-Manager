from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import expenses, ai_routes

app = FastAPI(
    title="SmartSpend API",
    description="Backend for the SmartSpend Cloud Native Expense Manager",
    version="1.0.0"
)

# CORS config allowing frontend apps to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incorporate Routers
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["Expenses"])
app.include_router(ai_routes.router, prefix="/api/v1/ai", tags=["AI Intelligence"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "SmartSpend API is up and running!"}
