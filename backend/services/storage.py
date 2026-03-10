"""
services/storage.py — Local file storage service.

WHY: In production, we'd save files to AWS S3 (a cloud drive). For local 
development, we save them to disk. We write a common interface so switching 
between local disk and S3 only requires changing this one file.

Think of this like a "filing cabinet" that knows where to put and find documents.
"""

import shutil
import uuid
from pathlib import Path
from typing import Optional

from config import UPLOAD_DIR


def save_file(file_content: bytes, original_filename: str) -> tuple[str, Path]:
    """
    Save uploaded file to disk with a unique ID.
    
    Parameters:
        file_content: The raw bytes of the uploaded file
        original_filename: What the user named the file (e.g. "report.pdf")
    
    Returns:
        (document_id, file_path) — a unique ID and where we saved it
    
    WHY unique ID: If two users upload "report.pdf", they'd overwrite each other
    without a unique ID. UUIDs guarantee uniqueness.
    """
    document_id = str(uuid.uuid4())
    extension = Path(original_filename).suffix.lower()
    
    # Create a subdirectory per document to keep things organized
    doc_dir = UPLOAD_DIR / document_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = doc_dir / f"original{extension}"
    file_path.write_bytes(file_content)
    
    return document_id, file_path


def get_file_path(document_id: str, filename: Optional[str] = None) -> Optional[Path]:
    """
    Find the file for a given document ID.
    Returns the path if it exists, None otherwise.
    """
    doc_dir = UPLOAD_DIR / document_id
    if not doc_dir.exists():
        return None
    
    if filename:
        path = doc_dir / filename
        return path if path.exists() else None
    
    # Return the first file in the directory
    files = list(doc_dir.iterdir())
    return files[0] if files else None


def delete_file(document_id: str) -> bool:
    """
    Delete all files associated with a document ID.
    Returns True if successful, False if not found.
    """
    doc_dir = UPLOAD_DIR / document_id
    if not doc_dir.exists():
        return False
    shutil.rmtree(doc_dir)
    return True


def list_files() -> list[dict]:
    """List all stored document IDs and their files."""
    result = []
    if not UPLOAD_DIR.exists():
        return result
    
    for doc_dir in UPLOAD_DIR.iterdir():
        if doc_dir.is_dir():
            files = list(doc_dir.iterdir())
            if files:
                result.append({
                    "document_id": doc_dir.name,
                    "file_path": str(files[0]),
                    "filename": files[0].name,
                    "size_bytes": files[0].stat().st_size,
                })
    return result
