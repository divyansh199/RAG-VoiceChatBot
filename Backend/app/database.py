from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
from loguru import logger


client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    """create database connection"""

    global client, database
    try:

        client = AsyncIOMotorClient(

            settings.MONGO_URL,
            serverSelectionTimeoutMS=30000, #30sec
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
        )
        database = client[settings.DB_NAME]

        await client.admin.command('ping')
        logger.info(f"connection to mongodb: {settings.DB_NAME}")

    except Exception as e:
        logger.info(f"Failed to connect MongoDB: {str(e)}")
        raise


async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB Connection Closed")

def get_database()->AsyncIOMotorDatabase:
    return database


