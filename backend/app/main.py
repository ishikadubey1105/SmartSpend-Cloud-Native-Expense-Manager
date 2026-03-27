"""
SmartSpend Backend — Python/FastAPI
A production-ready API server with:
  - MongoDB (Motor async driver)
  - Firebase Authentication
  - Gemini AI (insights, categorization, receipt OCR, chat)
  - Anomaly detection (z-score)
  - Full REST API for expenses, analytics, budgets, users
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.core.database import connect_db, close_db
from app.core.firebase import initialize_firebase
from app.api import expenses, analytics, ai_routes, users_budgets, bucket_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    initialize_firebase()
    await connect_db()
    print("🚀 SmartSpend API ready")
    yield
    # Shutdown
    await close_db()


settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Python/FastAPI backend for SmartSpend Cloud-Native Expense Manager",
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS — allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CLIENT_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount API Routes (matching Node.js server path structure) ─────────────────
app.include_router(users_budgets.router, prefix="/api", tags=["Users & Budgets"])
app.include_router(expenses.router,      prefix="/api/expenses", tags=["Expenses"])
app.include_router(analytics.router,     prefix="/api/analytics", tags=["Analytics"])
app.include_router(bucket_routes.router, prefix="/api/bucket-list", tags=["Bucket List"])
app.include_router(ai_routes.router,     prefix="/api/insights", tags=["AI Insights"])


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "SmartSpend API (Python) is running!",
        "version": settings.VERSION,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "uptime": "healthy"}
