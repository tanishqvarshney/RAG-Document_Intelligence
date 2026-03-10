"""
routers/documents.py — Document management endpoints.

List all documents, get a single document's metadata, delete a document.
This powers the sidebar in the frontend where users see their uploaded files.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from auth import get_current_user
from services.ingestion import get_all_documents, get_document, delete_document_from_index
from services.storage import delete_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["Document Management"])


@router.get("/", summary="List all uploaded documents")
async def list_documents(current_user: str = Depends(get_current_user)):
    """Return metadata for all documents in the system."""
    docs = get_all_documents()
    logger.info(f"[DOCS] User '{current_user}' listed {len(docs)} document(s)")
    return {"documents": docs, "count": len(docs)}


@router.get("/{document_id}", summary="Get metadata for a specific document")
async def get_document_meta(
    document_id: str,
    current_user: str = Depends(get_current_user),
):
    """Return metadata for a single document by ID."""
    doc = get_document(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found. It may have been deleted.",
        )
    return doc


@router.delete("/{document_id}", summary="Delete a document and its index entries")
async def delete_document(
    document_id: str,
    current_user: str = Depends(get_current_user),
):
    """
    Delete a document from disk and remove its metadata from the store.
    NOTE: Full FAISS entry removal requires an index rebuild (queued for v2).
    The document will still not appear in future queries since metadata is removed.
    """
    doc = get_document(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    filename = doc.get("original_filename", document_id)
    
    # Remove from metadata store
    delete_document_from_index(document_id)
    
    # Remove from disk
    deleted = delete_file(document_id)
    
    logger.info(f"[DOCS] User '{current_user}' deleted document '{filename}' (id={document_id})")
    return {
        "message": f"Document '{filename}' successfully deleted.",
        "document_id": document_id,
        "file_deleted": deleted,
    }
