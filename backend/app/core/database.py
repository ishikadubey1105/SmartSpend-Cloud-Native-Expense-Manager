"""
MongoDB async connection using Motor.
Provides a shared database handle for the entire application.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None
_db = None


async def connect_db():
    """Initialize the MongoDB connection pool."""
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client.get_default_database()
    # Verify connection
    await _client.admin.command("ping")
    print(f"✅ Connected to MongoDB: {_db.name}")


async def close_db():
    """Close the MongoDB connection pool."""
    global _client
    if _client:
        _client.close()
        print("MongoDB connection closed.")


def get_db():
    """Return the database instance for dependency injection."""
    return _db
