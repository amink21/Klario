"""One-off Gemini API call for statement parsing. No PDF storage."""
import json
import logging
from typing import Any

from google import genai
from google.genai import types

from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.parser.gemini_prompt import build_prompt
from app.schemas import GeminiParseResponse

logger = logging.getLogger(__name__)

# Max size already enforced by caller (15MB)
PDF_MIME = "application/pdf"


def parse_pdf_with_gemini(pdf_bytes: bytes, timezone: str = "America/Montreal") -> GeminiParseResponse:
    """
    Send PDF bytes to Gemini, parse response as JSON, validate and return.
    Raises ValueError on invalid JSON or validation errors.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    prompt = build_prompt(timezone=timezone)

    # Build content: PDF part + text part
    blob = types.Blob(data=pdf_bytes, mime_type=PDF_MIME)
    part_pdf = types.Part(inline_data=blob)
    part_text = types.Part.from_text(text=prompt)
    content = types.Content(role="user", parts=[part_pdf, part_text])

    client = genai.Client(api_key=GEMINI_API_KEY)
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[content],
        )
    except Exception as e:
        err_msg = str(e).lower()
        if "429" in err_msg or "resource_exhausted" in err_msg or "quota" in err_msg:
            raise ValueError(
                "Gemini quota exceeded. Wait a minute and retry, or enable billing at https://ai.google.dev/gemini-api/docs/rate-limits"
            ) from e
        if "404" in err_msg or "not found" in err_msg:
            raise ValueError(
                f"Gemini model not found. Set GEMINI_MODEL in .env to an available model (e.g. gemini-2.0-flash). See https://ai.google.dev/gemini-api/docs/models"
            ) from e
        if "403" in err_msg or "permission" in err_msg:
            raise ValueError("Gemini API key invalid or not allowed for this model.") from e
        raise ValueError(f"Gemini API error: {e}") from e

    text = getattr(response, "text", None) or ""
    text = (text or "").strip()
    # Strip markdown code fence if present
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    try:
        data: dict[str, Any] = json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("Gemini returned non-JSON response: %s", str(e)[:200])
        raise ValueError("Gemini returned invalid JSON") from e

    # Validate and coerce to our schema
    try:
        out = GeminiParseResponse.model_validate(data)
    except Exception as e:
        logger.warning("Gemini response validation failed: %s", e)
        raise ValueError(f"Gemini response validation failed: {e}") from e

    return out
