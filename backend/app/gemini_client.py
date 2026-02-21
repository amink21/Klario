"""One-off Gemini API calls: statement parsing and daily brief. No PDF storage."""
import base64
import json
import logging
import urllib.request
import urllib.error
from typing import Any

from google import genai
from google.genai import types

from app.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_BRIEF_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_URL,
    OPENROUTER_MODEL,
)
from app.parser.gemini_prompt import build_prompt, GEMINI_SYSTEM_INSTRUCTION
from app.schemas import DailyBriefResponse, GeminiParseResponse

logger = logging.getLogger(__name__)

# Max size already enforced by caller (15MB)
PDF_MIME = "application/pdf"

BOTH_FAILED_MSG = "Both primary Gemini and OpenRouter fallback failed"


def _parse_response_text(text: str) -> GeminiParseResponse:
    """Strip markdown fence, parse JSON, validate. Raises ValueError on failure."""
    text = (text or "").strip()
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
        logger.warning("Non-JSON response: %s", str(e)[:200])
        raise ValueError("Invalid JSON") from e
    try:
        return GeminiParseResponse.model_validate(data)
    except Exception as e:
        logger.warning("Response validation failed: %s", e)
        raise ValueError(f"Response validation failed: {e}") from e


def _parse_pdf_with_openrouter(pdf_bytes: bytes, timezone: str) -> GeminiParseResponse:
    """Call OpenRouter Gemini 2.5 Flash for PDF parsing. Raises on failure."""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set")
    user_prompt = build_prompt(timezone=timezone)
    b64 = base64.b64encode(pdf_bytes).decode("ascii")
    data_url = f"data:application/pdf;base64,{b64}"
    body = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": GEMINI_SYSTEM_INSTRUCTION},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "file", "file": {"filename": "statement.pdf", "file_data": data_url}},
                ],
            },
        ],
    }
    req = urllib.request.Request(
        OPENROUTER_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            out = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise ValueError(f"OpenRouter HTTP {e.code}: {e.reason}") from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise ValueError(f"OpenRouter request failed: {e}") from e
    choices = out.get("choices") or []
    if not choices:
        raise ValueError("OpenRouter returned no choices")
    content = (choices[0].get("message") or {}).get("content") or ""
    return _parse_response_text(content)


def parse_pdf_with_gemini(pdf_bytes: bytes, timezone: str = "America/Montreal") -> GeminiParseResponse:
    """
    Send PDF bytes to Gemini, parse response as JSON, validate and return.
    On primary failure (429, timeout, 500, etc.), retry once via OpenRouter Gemini 2.5 Flash.
    Raises ValueError on invalid JSON, validation errors, or if both providers fail.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    prompt = build_prompt(timezone=timezone)
    blob = types.Blob(data=pdf_bytes, mime_type=PDF_MIME)
    part_pdf = types.Part(inline_data=blob)
    part_text = types.Part.from_text(text=prompt)
    content = types.Content(role="user", parts=[part_pdf, part_text])

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[content],
        )
        text = getattr(response, "text", None) or ""
        return _parse_response_text(text)
    except Exception as primary_err:
        logger.warning("Primary Gemini failed, using OpenRouter fallback: %s", str(primary_err)[:200])
        try:
            return _parse_pdf_with_openrouter(pdf_bytes, timezone)
        except Exception as fallback_err:
            logger.warning("OpenRouter fallback failed: %s", str(fallback_err)[:200])
            raise ValueError(BOTH_FAILED_MSG) from fallback_err


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
