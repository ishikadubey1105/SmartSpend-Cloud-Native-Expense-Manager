"""
Firebase Admin SDK initialization and token verification middleware.
"""

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Request, HTTPException, Depends
from app.core.config import get_settings
from app.core.database import get_db
import json

_firebase_initialized = False


def initialize_firebase():
    """Initialize Firebase Admin SDK using env vars or default credentials."""
    global _firebase_initialized
    if _firebase_initialized:
        return

    settings = get_settings()
    try:
        if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY:
            # Build credential dict from env (Vercel/Railway style)
            cred_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        else:
            # Default credentials (GCP-hosted environments)
            firebase_admin.initialize_app()

        _firebase_initialized = True
        print("✅ Firebase Admin initialized")
    except Exception as e:
        print(f"⚠️ Firebase init warning: {e}")


async def get_current_user(request: Request):
    """
    FastAPI dependency — verifies Firebase ID token from Authorization header,
    finds or creates the user in MongoDB, and returns the user document.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")

    token = auth_header.split(" ")[1]

    try:
        decoded = auth.verify_id_token(token)
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Find or create user in MongoDB
    db = get_db()
    user = await db.users.find_one({"firebaseUid": decoded["uid"]})

    if not user:
        user = {
            "firebaseUid": decoded["uid"],
            "email": decoded.get("email", ""),
            "displayName": decoded.get("name", decoded.get("email", "User").split("@")[0]),
            "photoURL": decoded.get("picture", ""),
            "currency": "INR",
            "monthlyBudget": 0,
            "language": "en",
            "categories": [
                "Food", "Transport", "Shopping", "Bills",
                "Health", "Education", "Entertainment", "Other",
            ],
        }
        result = await db.users.insert_one(user)
        user["_id"] = result.inserted_id

    return user
