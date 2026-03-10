"""
services/ingestion.py — Document ingestion pipeline.

HOW IT WORKS (layman):
1. You hand us a PDF/DOCX/CSV file.
2. We "read" it using LangChain's document loaders.
3. We cut it into small, overlapping chunks (like tearing a book into 2-page pieces
   with half a page overlap so we never lose context at the edges).
4. We send each chunk to OpenAI, which gives back a list of 1536 numbers (an "embedding")
   that represents the MEANING of that chunk in mathematical space.
5. We store those numbers in FAISS — a superfast similarity search engine.
   Similar-meaning chunks will be "near" each other in this number space.
6. We save metadata (who this doc is, when it was uploaded, etc.) to a JSON file.

WHY FAISS: Searching 1 million "meaning vectors" takes <100ms with FAISS because
it uses clever mathematical tricks (approximate nearest-neighbor) instead of
comparing every single one.

NOTE: Updated for LangChain 1.x — text_splitter moved to langchain_text_splitters package.
"""

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, CSVLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import (
    GOOGLE_API_KEY, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP,
    FAISS_INDEX_DIR, METADATA_FILE
)

logger = logging.getLogger(__name__)


def _load_metadata() -> dict:
    """Load the metadata store from disk. Returns empty dict if not found."""
    if METADATA_FILE.exists():
        return json.loads(METADATA_FILE.read_text())
    return {}


def _save_metadata(metadata: dict):
    """Persist the metadata store to disk."""
    METADATA_FILE.write_text(json.dumps(metadata, indent=2, default=str))


def _get_loader(file_path: Path):
    """
    Pick the right document loader based on file extension.
    
    WHY different loaders: PDFs need special parsing (they're basically images of text),
    Word docs have XML inside them, CSVs are tabular — each needs different handling.
    """
    ext = file_path.suffix.lower()
    if ext == ".pdf":
        return PyPDFLoader(str(file_path))
    elif ext in (".docx", ".doc"):
        return Docx2txtLoader(str(file_path))
    elif ext == ".csv":
        return CSVLoader(str(file_path))
    else:
        raise ValueError(f"Unsupported file type: {ext}. Supported: .pdf, .docx, .csv")


def ingest_document(
    document_id: str,
    file_path: Path,
    original_filename: str,
    username: str,
) -> dict:
    """
    Main ingestion function: load → split → embed → store.
    
    Returns metadata dict with chunk counts, page counts, etc.
    Raises ValueError or RuntimeError with descriptive messages on failure.
    """
    start_time = time.time()
    logger.info(f"[INGEST] Starting ingestion for '{original_filename}' (id={document_id})")

    # ── Step 1: Load the document ──────────────────────────────────────────────
    logger.info(f"[INGEST] Step 1/4: Loading document with appropriate loader...")
    try:
        loader = _get_loader(file_path)
        pages = loader.load()
        logger.info(f"[INGEST] Loaded {len(pages)} page(s) from '{original_filename}'")
        
        # Calculate full document word count
        total_word_count = sum(len(page.page_content.split()) for page in pages)
    except ValueError as e:
        logger.error(f"[INGEST] Failed to load document: {e}")
        raise
    except Exception as e:
        logger.error(f"[INGEST] Unexpected error loading document: {e}")
        raise RuntimeError(f"Failed to load document '{original_filename}': {str(e)}")

    # ── Step 2: Split into chunks ──────────────────────────────────────────────
    logger.info(f"[INGEST] Step 2/4: Splitting into chunks (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""],  # Try to split at paragraphs first
    )
    chunks = splitter.split_documents(pages)
    
    # Add document metadata to each chunk so we can filter later
    uploaded_at = datetime.now(timezone.utc).isoformat()
    for chunk in chunks:
        chunk.metadata["document_id"] = document_id
        chunk.metadata["original_filename"] = original_filename
        chunk.metadata["uploaded_at"] = uploaded_at
        chunk.metadata["uploaded_by"] = username

    logger.info(f"[INGEST] Split into {len(chunks)} chunk(s)")

    if not chunks:
        raise ValueError(f"Document '{original_filename}' appears to be empty or unreadable.")

    # ── Step 3: Generate embeddings ────────────────────────────────────────────
    logger.info(f"[INGEST] Step 3/4: Generating embeddings via Google ({EMBEDDING_MODEL})...")
    if not GOOGLE_API_KEY:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set. Please add it to your .env file. "
            "Get one at: https://aistudio.google.com/app/apikey"
        )
    
    try:
        embeddings = GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL,
            google_api_key=GOOGLE_API_KEY,
        )
    except Exception as e:
        logger.error(f"[INGEST] Failed to initialize Google embeddings: {e}")
        raise RuntimeError(f"Google embeddings initialization failed: {str(e)}")

    # ── Step 4: Store in FAISS ─────────────────────────────────────────────────
    logger.info(f"[INGEST] Step 4/4: Indexing into FAISS vector store...")
    try:
        faiss_index_path = FAISS_INDEX_DIR / "index"
        
        if faiss_index_path.exists():
            # Load existing index and add new documents to it
            logger.info(f"[INGEST] Loading existing FAISS index and appending...")
            vector_store = FAISS.load_local(
                str(faiss_index_path),
                embeddings,
                allow_dangerous_deserialization=True,
            )
            vector_store.add_documents(chunks)
        else:
            # Create a brand new index
            logger.info(f"[INGEST] Creating new FAISS index...")
            vector_store = FAISS.from_documents(chunks, embeddings)
        
        vector_store.save_local(str(faiss_index_path))
        logger.info(f"[INGEST] FAISS index saved to {faiss_index_path}")

    except Exception as e:
        logger.error(f"[INGEST] FAISS indexing failed: {e}")
        raise RuntimeError(f"Failed to index document in FAISS: {str(e)}")

    # ── Save metadata ──────────────────────────────────────────────────────────
    elapsed = round(time.time() - start_time, 2)
    meta = _load_metadata()
    meta[document_id] = {
        "document_id": document_id,
        "original_filename": original_filename,
        "uploaded_by": username,
        "uploaded_at": uploaded_at,
        "page_count": len(pages),
        "chunk_count": len(chunks),
        "word_count": total_word_count,
        "ingestion_time_seconds": elapsed,
        "file_path": str(file_path),
    }
    _save_metadata(meta)

    logger.info(f"[INGEST] ✅ Done! '{original_filename}' indexed in {elapsed}s — {len(chunks)} chunks from {len(pages)} pages.")
    return meta[document_id]


def delete_document_from_index(document_id: str) -> bool:
    """Remove a document's metadata from the store."""
    meta = _load_metadata()
    if document_id not in meta:
        return False
    
    del meta[document_id]
    _save_metadata(meta)
    logger.info(f"[INGEST] Removed document {document_id} from metadata store.")
    return True


def get_all_documents() -> list[dict]:
    """Return all document metadata records."""
    meta = _load_metadata()
    return list(meta.values())


def get_document(document_id: str) -> Optional[dict]:
    """Return metadata for a single document."""
    meta = _load_metadata()
    return meta.get(document_id)
