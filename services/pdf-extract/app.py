"""
PDF text extraction API. Accepts base64-encoded PDF, returns extracted text.
POST /extract  body: { "base64": "<base64>" }  -> { "text": "..." }
For statement PDFs (e.g. TD, RBC), only lines that look like transaction table rows are returned.
Run: flask --app app run -p 5000
Deploy: gunicorn -w 1 -b 0.0.0.0:5000 app:app
"""

import base64
import io
import os
import re

from flask import Flask, request, jsonify
from pypdf import PdfReader

app = Flask(__name__)

# Dollar amount at end of line (e.g. $3.10, -$127.15, $1,234.56)
AMOUNT_AT_END = re.compile(r"[-]?\s*\$\s*\d{1,3}(?:,\d{3})*\.\d{2}\s*$|[-]?\s*\$\s*\d+\.\d{2}\s*$")

# Skip lines that are clearly not transaction rows (headers, summary, contact info, etc.)
SKIP_PATTERNS = [
    re.compile(r"^\s*(TRANSACTION\s+DATE|POSTING\s+DATE|ACTIVITY\s+DESCRIPTION|AMOUNT)\s*$", re.I),
    re.compile(r"^\s*(PREVIOUS\s+STATEMENT|TOTAL\s+NEW\s+BALANCE|NEW\s+BALANCE)\s*", re.I),
    re.compile(r"^\s*PAYMENT\s+INFORMATION\s*$", re.I),
    re.compile(r"^\s*Minimum\s+Payment\s*", re.I),
    re.compile(r"^\s*Payment\s+Due\s+Date\s*", re.I),
    re.compile(r"^\s*Credit\s+Limit\s*", re.I),
    re.compile(r"^\s*Available\s+Credit\s*", re.I),
    re.compile(r"^\s*CONTACT\s+INFORMATION\s*$", re.I),
    re.compile(r"^\s*CALCULATING\s+YOUR\s+BALANCE\s*$", re.I),
    re.compile(r"^\s*TD\s+CASH\s+BACK\s+(CARD|DOLLARS)\s*$", re.I),
    re.compile(r"^\s*Estimated\s+Time\s+to\s+Pay\s*", re.I),
    re.compile(r"^\s*Annual\s+Interest\s+Rate\s*", re.I),
    re.compile(r"^\s*Page\s+\d+\s+of\s+\d+\s*$", re.I),
    re.compile(r"^\s*[-.\s]+\s*$"),  # separator lines
]


def _is_skip_line(line: str) -> bool:
    s = line.strip()
    if len(s) < 5:
        return True
    for pat in SKIP_PATTERNS:
        if pat.search(s):
            return True
    return False


def _looks_like_transaction_line(line: str) -> bool:
    """True if line has a dollar amount (e.g. $12.34 or -$12.34) and isn't a header/summary."""
    if _is_skip_line(line):
        return False
    if not AMOUNT_AT_END.search(line):
        return False
    # Require some description (at least a few chars before the amount)
    before_amount = re.sub(r"[-]?\s*\$\s*\d{1,3}(?:,\d{3})*\.\d{2}\s*$|[-]?\s*\$\s*\d+\.\d{2}\s*$", "", line).strip()
    return len(before_amount) >= 2


def filter_statement_lines(lines: list[str]) -> list[str]:
    """Keep only lines that look like transaction table rows (date, description, amount)."""
    return [line for line in lines if _looks_like_transaction_line(line)]

# Allow app to call this from another origin (e.g. Expo)
@app.after_request
def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


@app.route("/extract", methods=["OPTIONS"])
def extract_options():
    return "", 204


@app.route("/")
def index():
    return jsonify({"service": "pdf-extract", "endpoint": "POST /extract with JSON { \"base64\": \"<base64-pdf>\" }"}), 200


@app.route("/extract", methods=["POST"])
def extract():
    try:
        body = request.get_json(force=True, silent=True) or {}
        b64 = body.get("base64") if isinstance(body, dict) else None
        if not b64 or not isinstance(b64, str):
            print("[POST /extract] Missing or invalid base64 in body")
            return jsonify({"error": "Request body must be JSON with a string 'base64' field. Got missing or invalid base64."}), 400
        print("[POST /extract] Received base64 payload, length:", len(b64))

        raw = base64.b64decode(b64, validate=True)
        stream = io.BytesIO(raw)
        reader = PdfReader(stream)
        parts = []
        for page in reader.pages:
            t = page.extract_text()
            parts.append(t or "")
        text = "\n".join(parts).replace("\r\n", "\n").strip()
        # collapse repeated spaces within each line only (keep newlines)
        lines = [" ".join(line.split()) for line in text.split("\n")]
        non_empty = [line for line in lines if line.strip()]
        # For statement PDFs: keep only lines that look like transaction rows (date, description, $amount)
        transaction_lines = filter_statement_lines(non_empty)
        text = "\n".join(transaction_lines) if transaction_lines else "\n".join(non_empty)

        return jsonify({"text": text}), 200
    except base64.binascii.Error as e:
        return jsonify({"error": "Invalid base64"}), 400
    except Exception as e:
        return jsonify({"error": f"PDF extraction failed: {e!s}"}), 422


@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
