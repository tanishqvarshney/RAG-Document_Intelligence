"""
main.py — FastAPI application entry point.

WHY: This is like the "lobby" of our building. It sets up:
- CORS: Lets the React frontend (on port 5173) talk to this backend (port 8000)
- Rate limiting: Prevents abuse (no more than 60 requests/minute per IP)
- Global error handler: Catches any unhandled crash and returns a clean JSON error
- Health check: A simple ping endpoint to verify the service is alive
- Logging: Gives developers visibility into every request and error in real-time

All individual "rooms" (upload, chat, documents) are registered as routers below.
"""

import logging
import time
import traceback
from contextlib import asynccontextmanager
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import UPLOAD_DIR, FAISS_INDEX_DIR, GOOGLE_API_KEY
from routers import auth, upload, chat, documents

# ─── Logging Setup ─────────────────────────────────────────────────────────────
# WHY: Logging is the "black box recorder" of our app. When something goes wrong,
# logs tell us exactly what happened, in what order, and why.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Lifespan (startup/shutdown) ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run on startup and shutdown."""
    logger.info("=" * 60)
    logger.info("🚀 DocuMind Backend Starting Up")
    logger.info(f"   Upload directory : {UPLOAD_DIR}")
    logger.info(f"   FAISS store      : {FAISS_INDEX_DIR}")
    logger.info(f"   Google API Key   : {'✅ SET' if GOOGLE_API_KEY else '❌ NOT SET — set GOOGLE_API_KEY in .env'}")
    logger.info("=" * 60)
    yield
    logger.info("DocuMind Backend shutting down. Goodbye!")


# ─── App Instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="DocuMind — AI RAG API",
    description="""
## DocuMind: AI-Powered Document Q&A System

Upload **PDFs, DOCX, CSVs** → Ask questions in plain English → Get AI answers with source citations.

### How it works
1. **Upload** a document → it gets split into chunks, embedded with OpenAI, and stored in FAISS
2. **Chat** — ask a question → FAISS finds relevant chunks → GPT-4o generates an answer
3. **Sources** — every answer includes citations showing which document parts were used

### Authentication
All endpoints (except `/api/auth/login` and `/api/health`) require a **JWT Bearer token**.
Get one by calling `POST /api/auth/login` with `{"username": "admin", "password": "admin123"}`.
    """,
    version="1.0.0",
    lifespan=lifespan,
)


# ─── CORS Middleware ───────────────────────────────────────────────────────────
# WHY: Browsers block cross-origin requests by default (it's a security feature).
# We explicitly tell the browser "it's okay for the frontend at :5173 to talk to us."
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174",
        "http://localhost:5175", "http://localhost:5176",
        "http://localhost:3000",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Rate Limiting ─────────────────────────────────────────────────────────────
# Simple in-memory rate limiter (60 requests/minute per IP)
# WHY: Without rate limiting, a single user/bot could send thousands of requests
# per second to GPT-4 and bankrupt your OpenAI account.
_request_counts: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 60   # requests per minute

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.url.path != "/api/health":
        client_ip = request.client.host
        now = time.time()
        window_start = now - 60  # 1-minute sliding window
        
        # Remove timestamps older than 1 minute
        _request_counts[client_ip] = [t for t in _request_counts[client_ip] if t > window_start]
        
        if len(_request_counts[client_ip]) >= RATE_LIMIT:
            logger.warning(f"[RATE LIMIT] IP {client_ip} exceeded {RATE_LIMIT} req/min")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "detail": f"You've made {RATE_LIMIT} requests in the last minute. Please wait before trying again.",
                    "retry_after_seconds": 60,
                },
            )
        _request_counts[client_ip].append(now)
    
    return await call_next(request)


# ─── Request Logging Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)")
    return response


# ─── Global Exception Handler ──────────────────────────────────────────────────
# WHY: Any unhandled exception would normally return a confusing HTML error page
# or a 500 with no detail. We catch everything and return structured JSON so the
# frontend can display a clear error message to the user.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"[UNHANDLED ERROR] {request.method} {request.url.path}\n{tb}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": request.url.path,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
async def health_check():
    """Quick ping to verify the backend is running."""
    return {
        "status": "healthy",
        "service": "DocuMind RAG API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "api_key_configured": bool(GOOGLE_API_KEY),
    }


# ─── Register Routers ─────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(documents.router)

logger.info("All routers registered: /auth, /upload, /chat, /documents")
