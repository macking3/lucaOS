import os
import sys
import asyncio
import numpy as np
from dotenv import load_dotenv

# Load env
load_dotenv(".env.local")
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")

print(f"DEBUG: API Key present? {bool(GOOGLE_API_KEY)}")
if GOOGLE_API_KEY:
    print(f"DEBUG: API Key length: {len(GOOGLE_API_KEY)}")

os.environ["LLM_BINDING_API_KEY"] = GOOGLE_API_KEY or ""
os.environ["GEMINI_API_KEY"] = GOOGLE_API_KEY or ""

try:
    from lightrag import LightRAG, QueryParam
    from lightrag.utils import EmbeddingFunc
    from lightrag.llm.gemini import gemini_model_complete
    import google.generativeai as genai
    
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        print("DEBUG: genai configured")

    # Custom Embedding Function Wrapper
    class GeminiEmbedding(EmbeddingFunc):
        def __call__(self, texts: list[str]) -> np.ndarray:
            return asyncio.run(self.acall(texts))

        async def acall(self, texts: list[str]) -> np.ndarray:
            if not GOOGLE_API_KEY:
                return np.zeros((len(texts), 768)) 
            
            try:
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=texts,
                    task_type="retrieval_document"
                )
                return np.array(result['embedding'])
            except Exception as e:
                print(f"[CORTEX] Embedding Error: {e}")
                return np.zeros((len(texts), 768))

    rag_embedding_func = GeminiEmbedding(func=None, embedding_dim=768, max_token_size=2048)
    
    RAG_DIR = "./rag_storage_test"
    if not os.path.exists(RAG_DIR):
        os.makedirs(RAG_DIR)

    print("DEBUG: Initializing LightRAG...")
    rag = LightRAG(
        working_dir=RAG_DIR,
        llm_model_func=gemini_model_complete,
        llm_model_name="gemini-2.5-flash-latest",
        embedding_func=rag_embedding_func,
        llm_model_max_async=4
    )
    
    async def test_init():
        await rag.initialize_storages()
        print("DEBUG: LightRAG initialized successfully")

    asyncio.run(test_init())

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
