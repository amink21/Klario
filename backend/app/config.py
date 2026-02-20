"""App configuration from environment."""
import os
from pathlib import Path

# Load .env from backend/ or project root so GEMINI_API_KEY is set when running uvicorn
try:
    from dotenv import load_dotenv
    _backend_dir = Path(__file__).resolve().parent.parent  # backend/
    load_dotenv(_backend_dir / ".env")
    load_dotenv(_backend_dir.parent / ".env")  # Life_App/.env
except ImportError:
    pass  # dotenv optional

# API key for import endpoint (optional; if set, X-KLARIO-IMPORT-KEY required)
IMPORT_API_KEY: str = os.environ.get("IMPORT_API_KEY", "")

# Gemini API key (Render env: GEMINI_API_KEY or GOOGLE_API_KEY)
GEMINI_API_KEY: str = (
    os.environ.get("GEMINI_API_KEY", "").strip()
    or os.environ.get("GOOGLE_API_KEY", "").strip()
)

# Gemini model for statement parsing (must support PDF; see https://ai.google.dev/gemini-api/docs/models)
GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# Gemini model for morning brief (text-only). Always 2.5 to match API key.
GEMINI_BRIEF_MODEL: str = os.environ.get("GEMINI_BRIEF_MODEL", "gemini-2.5-flash")

# Max upload size in MB (default 15)
MAX_UPLOAD_MB: int = int(os.environ.get("MAX_UPLOAD_MB", "15"))

# Rate limit: requests per minute per IP
RATE_LIMIT_PER_MINUTE: int = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "10"))

# CORS origins (comma-separated); "*" for allow all in dev
CORS_ORIGINS: str = os.environ.get("CORS_ORIGINS", "*")

# Default timezone for date parsing
DEFAULT_TIMEZONE: str = os.environ.get("TIMEZONE", "America/Montreal")
