"""
Klario import API: one-and-done PDF statement parsing.
No PDF storage; temp file deleted immediately after parse.
Gemini endpoint: read upload into memory, send to Gemini, return parsed transactions.
"""
import asyncio
import logging
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    CORS_ORIGINS,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    IMPORT_API_KEY,
    MAX_UPLOAD_MB,
    RATE_LIMIT_PER_MINUTE,
)
from app.gemini_client import parse_pdf_with_gemini
from app.parser.statement_parser import parse_statement
from app.schemas import GeminiParseResponse, ParseStatementResponse
from app.utils.files import cleanup_temp_file, save_temp_pdf, validate_pdf_upload
from app.utils.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

MAX_PDF_BYTES = MAX_UPLOAD_MB * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/octet-stream"}

# In-memory rate limit: ip -> list of request timestamps
_rate: defaultdict[str, list[float]] = defaultdict(list)


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window = 60.0  # 1 minute
    _rate[ip] = [t for t in _rate[ip] if now - t < window]
    if len(_rate[ip]) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many requests")
    _rate[ip].append(now)


def _check_api_key(x_key: str | None) -> None:
    if not IMPORT_API_KEY:
        return  # no key configured = no auth (dev only)
    if x_key != IMPORT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-KLARIO-IMPORT-KEY")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # cleanup on shutdown if needed
    pass


app = FastAPI(title="Klario Import API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()] if CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/imports/statement/parse", response_model=ParseStatementResponse)
def parse_statement_upload(
    request: Request,
    file: UploadFile = File(..., description="PDF statement file"),
    source: str | None = Form(None),
    timezone: str | None = Form(None),
    x_klario_import_key: str | None = Header(None, alias="X-KLARIO-IMPORT-KEY"),
):
    """
    Upload a PDF statement; server parses it and returns transactions for client review.
    PDF is not stored; temp file is deleted immediately after parsing.
    """
    _check_rate_limit(request.client.host if request.client else "unknown")
    _check_api_key(x_klario_import_key)

    temp_path = None
    try:
        validate_pdf_upload(file)
        temp_path = save_temp_pdf(file)
        tz = timezone or "America/Montreal"
        result = parse_statement(temp_path, source=source or "", timezone=tz)
        return result
    except ValueError as e:
        msg = str(e)
        if "exceeds" in msg.lower():
            raise HTTPException(status_code=413, detail=msg)
        raise HTTPException(status_code=400, detail=msg)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Parse failed: {e}")
    finally:
        cleanup_temp_file(temp_path)


@app.post("/imports/statement/parse-gemini", response_model=GeminiParseResponse)
async def parse_statement_gemini(
    request: Request,
    file: UploadFile = File(..., description="PDF bank statement"),
    timezone: str = Form("America/Montreal"),
    x_klario_import_key: str | None = Header(None, alias="X-KLARIO-IMPORT-KEY"),
):
    """
    Upload a PDF statement; server sends it to Gemini and returns Supabase-ready transactions.
    PDF is read into memory only (no disk storage). One and done.
    """
    request_id = str(uuid.uuid4())[:8]
    _check_rate_limit(request.client.host if request.client else "unknown")
    _check_api_key(x_klario_import_key)

    # Content type: allow pdf or octet-stream
    ct = (file.content_type or "").lower()
    if ct and ct not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted (application/pdf)")

    # Read into memory (max 15MB)
    try:
        pdf_bytes = await file.read()
    except Exception as e:
        logger.warning("[%s] Failed to read upload: %s", request_id, e)
        raise HTTPException(status_code=400, detail="Failed to read file") from e

    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_MB}MB limit",
        )

    if not GEMINI_API_KEY:
        logger.error("[%s] GEMINI_API_KEY not set", request_id)
        raise HTTPException(status_code=503, detail="Gemini API not configured")

    try:
        result = await asyncio.to_thread(parse_pdf_with_gemini, pdf_bytes, timezone)
    except ValueError as e:
        msg = str(e)
        logger.warning("[%s] Gemini parse error: %s", request_id, msg[:200])
        raise HTTPException(status_code=502, detail=msg) from e

    # Log without leaking statement content
    logger.info(
        "[%s] file_size=%d transactions=%d warnings=%d",
        request_id,
        len(pdf_bytes),
        len(result.transactions),
        len(result.warnings),
    )
    return result
