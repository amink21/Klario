"""One-off Gemini API calls: statement parsing and daily brief. No PDF storage."""
import json
import logging
from typing import Any

from google import genai
from google.genai import types

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_BRIEF_MODEL
from app.parser.gemini_prompt import build_prompt
from app.schemas import DailyBriefResponse, GeminiParseResponse

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
        if "expired" in err_msg or "renew" in err_msg:
            raise ValueError(
                "Gemini API key has expired. Create a new key at https://aistudio.google.com/apikey "
                "then set GEMINI_API_KEY in Render Dashboard → Environment and redeploy."
            ) from e
        if "429" in err_msg or "resource_exhausted" in err_msg or "quota" in err_msg:
            raise ValueError(
                "Gemini quota exceeded. Wait a minute and retry, or enable billing at https://ai.google.dev/gemini-api/docs/rate-limits"
            ) from e
        if "404" in err_msg or "not found" in err_msg:
            raise ValueError(
                f"Gemini model not found. Set GEMINI_MODEL in .env to an available model (e.g. gemini-2.0-flash). See https://ai.google.dev/gemini-api/docs/models"
            ) from e
        if "403" in err_msg or "permission" in err_msg or "invalid" in err_msg or "401" in err_msg:
            raise ValueError(
                "Gemini API key invalid or not allowed. Create or check your key at https://aistudio.google.com/apikey "
                "and set GEMINI_API_KEY in Render environment variables."
            ) from e
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


# Daily brief: text-only, same prompt as app
DAILY_BRIEF_SYSTEM = (
    "Generate a calm, brief daily summary. Tone: calm, non-judgmental, no emojis, no financial shaming. "
    "Output JSON: { \"lines\": [ \"line1\", \"line2\", ... ] }. Max 4 short bullet lines. "
    "Respond with valid JSON only. No markdown, no explanation."
)
def generate_daily_brief(payload: dict[str, Any]) -> DailyBriefResponse:
    """
    Call Gemini for morning brief. Uses GEMINI_API_KEY from env (e.g. Render).
    Raises ValueError on missing key or API error.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set on the server")

    user_text = json.dumps(payload)
    full_prompt = f"{DAILY_BRIEF_SYSTEM}\n\n{user_text}"

    client = genai.Client(api_key=GEMINI_API_KEY)
    try:
        response = client.models.generate_content(
            model=GEMINI_BRIEF_MODEL,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=full_prompt)])],
            config=types.GenerateContentConfig(
                temperature=0.4,
                max_output_tokens=500,
                response_mime_type="application/json",
            ),
        )
    except Exception as e:
        err_msg = str(e).lower()
        if "expired" in err_msg or "renew" in err_msg:
            raise ValueError(
                "Gemini API key has expired. Create a new key at https://aistudio.google.com/apikey "
                "then set GEMINI_API_KEY in Render environment variables and redeploy."
            ) from e
        if "429" in err_msg or "resource_exhausted" in err_msg or "quota" in err_msg:
            raise ValueError("Gemini rate limit exceeded. Wait a minute and try again.") from e
        if "403" in err_msg or "permission" in err_msg or "invalid" in err_msg or "401" in err_msg:
            raise ValueError(
                "Gemini API key invalid or expired. Create or check your key at https://aistudio.google.com/apikey "
                "and set GEMINI_API_KEY in Render environment variables."
            ) from e
        raise ValueError(f"Gemini API error: {e}") from e

    text = (getattr(response, "text", None) or "").strip()
    if not text:
        raise ValueError("Empty response from Gemini")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("Daily brief non-JSON: %s", str(e)[:200])
        raise ValueError("Gemini returned invalid JSON") from e

    try:
        return DailyBriefResponse.model_validate(data)
    except Exception as e:
        raise ValueError(f"Invalid brief format: {e}") from e
