import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

def initialize_firebase():
    # Attempt to initialize firebase, wrap in try/except in case creds aren't present yet
    try:
        if not firebase_admin._apps:
            # We assume a service account JSON is placed at root in production
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-adminsdk.json")
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin initialized successfully via file.")
            else:
                # Initialize default app if hosted on GCP/Firebase Cloud Functions/Run
                firebase_admin.initialize_app()
                print("Firebase Admin initialized via application default credentials.")
    except Exception as e:
        print(f"Warning: Firebase initialization failed. Error: {e}")

initialize_firebase()

# Export firestore client
def get_db():
    try:
        return firestore.client()
    except Exception:
        return None
