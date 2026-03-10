"""
routers/upload.py — Document upload endpoint.

WHY: This is the "intake desk" of our system. The user drops a file here.
We validate it, save it, and trigger the ingestion pipeline that reads the
file and stores its meaning (embeddings) into FAISS.

SUPPORTED FORMATS: PDF, DOCX, CSV
"""

import logging
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from auth import get_current_user
from services.storage import save_file, delete_file
from services.ingestion import ingest_document, get_all_documents, get_document, delete_document_from_index

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".csv"}
MAX_FILE_SIZE_MB = 50


class DocumentMeta(BaseModel):
    document_id: str
    original_filename: str
    uploaded_by: str
    uploaded_at: str
    page_count: int
    chunk_count: int
    ingestion_time_seconds: float


@router.post(
    "/upload",
    response_model=DocumentMeta,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and index a document",
)
async def upload_document(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    """
    Upload a PDF, DOCX, or CSV file. The file will be:
    1. Validated (type and size check)
    2. Saved to disk
    3. Processed through the ingestion pipeline (chunking + embedding + FAISS indexing)
    4. Metadata returned with page count, chunk count, and processing time
    
    **Returns:** Document metadata including its unique ID for later use in chat.
    """
    logger.info(f"[UPLOAD] User '{current_user}' uploading '{file.filename}'")

    # ── Validate file extension ────────────────────────────────────────────────
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        logger.warning(f"[UPLOAD] Rejected file '{file.filename}' — unsupported type '{ext}'")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # ── Check for duplicates ───────────────────────────────────────────────────
    existing_docs = get_all_documents()
    for doc in existing_docs:
        if doc.get("uploaded_by") == current_user and doc.get("original_filename") == file.filename:
            logger.warning(f"[UPLOAD] Rejected file '{file.filename}' — duplicate for user '{current_user}'")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A document named '{file.filename}' has already been uploaded.",
            )

    # ── Read file content ──────────────────────────────────────────────────────
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    
    if size_mb > MAX_FILE_SIZE_MB:
        logger.warning(f"[UPLOAD] Rejected file '{file.filename}' — size {size_mb:.1f}MB > {MAX_FILE_SIZE_MB}MB limit")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({size_mb:.1f}MB). Maximum allowed: {MAX_FILE_SIZE_MB}MB",
        )

    logger.info(f"[UPLOAD] File '{file.filename}' is {size_mb:.2f}MB — starting save...")

    # ── Save to disk ───────────────────────────────────────────────────────────
    try:
        document_id, file_path = save_file(content, file.filename)
        logger.info(f"[UPLOAD] Saved to {file_path} with document_id={document_id}")
    except Exception as e:
        logger.error(f"[UPLOAD] Failed to save file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )

    # ── Run ingestion pipeline ─────────────────────────────────────────────────
    try:
        meta = ingest_document(
            document_id=document_id,
            file_path=file_path,
            original_filename=file.filename,
            username=current_user,
        )
        logger.info(f"[UPLOAD] ✅ Ingestion complete for document_id={document_id}")
        return meta
    except ValueError as e:
        # Validation error (empty file, unsupported content, etc.)
        logger.error(f"[UPLOAD] Ingestion validation error: {e}")
        delete_file(document_id)  # Clean up the saved file
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except RuntimeError as e:
        # System-level error (OpenAI failure, FAISS error, etc.)
        logger.error(f"[UPLOAD] Ingestion runtime error: {e}")
        delete_file(document_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"[UPLOAD] Unexpected ingestion error: {e}", exc_info=True)
        delete_file(document_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during document processing: {str(e)}",
        )
