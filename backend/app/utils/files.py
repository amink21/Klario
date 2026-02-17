"""Safe temp file handling for PDF uploads. No persistent storage."""
import os
import tempfile
from typing import NoReturn

from fastapi import UploadFile

from app.config import MAX_UPLOAD_MB

MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"application/pdf"}


def validate_pdf_upload(file: UploadFile) -> None:
    """Validate content type and size. Raises ValueError with message."""
    if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Only PDF files are accepted")
    # Size is checked when reading into temp file (we read in chunks up to MAX_BYTES)


def save_temp_pdf(file: UploadFile) -> str:
    """
    Stream upload to a named temp file. Enforces max size.
    Returns path to the temp file. Caller must call cleanup_temp_file when done.
    """
    validate_pdf_upload(file)
    fd, path = tempfile.mkstemp(suffix=".pdf", prefix="klario_import_")
    try:
        os.close(fd)
        total = 0
        with open(path, "wb") as out:
            while chunk := file.file.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_BYTES:
                    os.unlink(path)
                    raise ValueError(f"File exceeds {MAX_UPLOAD_MB}MB limit")
                out.write(chunk)
        return path
    except Exception:
        if os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass
        raise


def cleanup_temp_file(path: str | None) -> None:
    """Remove temp file if it exists. Idempotent."""
    if not path:
        return
    try:
        if os.path.exists(path):
            os.unlink(path)
    except OSError:
        pass
