import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartSpend API"
    API_V1_STR: str = "/api/v1"
    
    # Optional: Load these from environment variables if set, otherwise use defaults
    FIREBASE_CREDENTIALS_PATH: str = "firebase-adminsdk.json"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
