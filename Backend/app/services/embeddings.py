from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.config import settings

class EmbeddingService:

    def __init__(self):
        
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            output_dimensionality=settings.EMBEDDING_DIMENSIONS,
        )

        self.text_splitter = RecursiveCharacterTextSplitter(

            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            is_separator_regex=False,
        )



    def split_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []
        
        chunks = self.text_splitter.split_text(text)
        return chunks

    def embed_text(self, text: str)-> List[float]:
        if not text or not text.strip():
            raise ValueError("can't embed empty text")
        
        embedding = self.embeddings.embed_query(text)
        return embedding


    def embed_texts(self, texts: List[str])->list[list[float]]:
        if not texts:
            return []

        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            return []
        
        embedding = self.embeddings.embed_documents(valid_texts)
        return embedding 

# a = EmbeddingService()

# print(a.embed_text("It represents the fundamental idea of applying force through leverage and controlled impact. The hammer has been used in construction, metalworking, carpentry, stone work, and daily household activities. From ancient civilizations to modern industrial societies, the"))


