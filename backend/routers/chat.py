"""
routers/chat.py — RAG Q&A chat endpoint.

WHY: This is the "brain" endpoint. The user asks a question, we find the most 
relevant parts of their documents, and GPT-4o generates a precise answer citing
those sources. This is the whole magic of RAG.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth import get_current_user
from services.retrieval import answer_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chat / Q&A"])


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=3, description="Your question about the documents")
    document_ids: Optional[list[str]] = Field(
        None,
        description="Optional list of document IDs to scope the search. If None, searches all documents."
    )
    date_from: Optional[str] = Field(None, description="Filter: only use documents uploaded after this ISO date")
    date_to: Optional[str] = Field(None, description="Filter: only use documents uploaded before this ISO date")


class SourceCitation(BaseModel):
    document_id: str
    filename: str
    page: int
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]
    latency_ms: int
    question: str


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Ask a question about your documents",
)
async def chat(
    request: ChatRequest,
    current_user: str = Depends(get_current_user),
):
    """
    Ask a natural language question. The system will:
    1. Find the most relevant passages in your uploaded documents
    2. Feed them as context to GPT-4o
    3. Return the answer + which document passages it came from
    
    Optionally filter by document_ids to only search specific files.
    """
    logger.info(f"[CHAT] User '{current_user}' asked: '{request.question[:80]}...'")

    try:
        result = answer_question(
            question=request.question,
            document_ids=request.document_ids,
            date_from=request.date_from,
            date_to=request.date_to,
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            latency_ms=result["latency_ms"],
            question=request.question,
        )
    except RuntimeError as e:
        logger.error(f"[CHAT] Retrieval failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"[CHAT] Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )
