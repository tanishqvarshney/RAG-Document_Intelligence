"""
config.py — Central configuration for DocuMind backend.

WHY: Instead of hardcoding values like API keys and folder paths everywhere,
we put them all in one place. This makes it easy to change settings and keeps
secrets out of the code (they live in a .env file instead).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load variables from .env file into the environment
load_dotenv()

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
FAISS_INDEX_DIR = Path(os.getenv("FAISS_INDEX_DIR", str(BASE_DIR / "faiss_store")))
METADATA_FILE = FAISS_INDEX_DIR / "metadata.json"

# Create directories if they don't exist yet
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FAISS_INDEX_DIR.mkdir(parents=True, exist_ok=True)

# ─── Google Gemini ────────────────────────────────────────────────────────────
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
EMBEDDING_MODEL = "models/gemini-embedding-001"   # For turning text → numbers
CHAT_MODEL = "gemini-2.5-flash"                 # For generating answers (most widely available free tier)

# ─── Security ─────────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "documind-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# ─── RAG Settings ─────────────────────────────────────────────────────────────
CHUNK_SIZE = 500          # How many tokens per chunk (like a paragraph)
CHUNK_OVERLAP = 50        # How many tokens overlap between chunks (for context)
TOP_K_RESULTS = 5         # How many similar chunks to retrieve per question

# ─── Demo User (for local development, no real auth DB needed) ───────────────
DEMO_USERS = {
    "admin": "admin123",
    "demo": "demo123",
}
