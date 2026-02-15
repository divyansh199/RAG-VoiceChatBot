from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):

    MONGO_URL: str
    DB_NAME: str = "live_db"
    GOOGLE_API_KEY: str 
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 786
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 250
    VECTOR_INDEX_NAME: str = "vector_index"
    DOCUMENT_CHUNKS_COLLECTION: str = "document_chunks_collection"
    TENANT_ID: str = "mvp tenant"
    USER_ID: str = "mvp user"
    DEEPGRAM_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "pNInz6obpgDQGcFmaJgB"

    class Config:
        env_file = ".env"
        case_sensitive = True


    
settings = Settings()

