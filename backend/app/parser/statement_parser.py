"""Orchestrate PDF -> transaction list with confidence and warnings."""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any

from app.schemas import ParseStats, ParseStatementResponse, TransactionOut
from app.parser.pdf_text import extract_all_content, content_to_lines
from app.parser.heuristics import (
    infer_category,
    parse_date_iso,
    parse_amount_cents,
    has_date,
    has_amount,
)

logger = logging.getLogger(__name__)

# Skip header-like lines
SKIP_PATTERNS = [
    re.compile(r"^\s*(date|description|amount|balance|debit|credit)\s*$", re.I),
    re.compile(r"^\s*statement\s+period\s*", re.I),
    re.compile(r"^\s*page\s+\d+\s+of\s+\d+\s*$", re.I),
    re.compile(r"^\s*---+\s*$"),
    re.compile(r"^\s*\.+\s*$"),
]


def _is_likely_header_or_noise(line: str) -> bool:
    if len(line) < 4:
        return True
    for pat in SKIP_PATTERNS:
        if pat.search(line.strip()):
            return True
    return False


def _normalize_title(line: str, amount_str: str | None) -> str:
    """Remove date and amount substrings to get description/title."""
    # Remove common date formats
    cleaned = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", line)
    cleaned = re.sub(r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\b", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b", "", cleaned)
    cleaned = re.sub(r"[-]?\d{1,3}(?:,\d{3})*\.\d{2}\b", "", cleaned)
    cleaned = re.sub(r"\s+(?:CR|DR)\b", "", cleaned, flags=re.I)
    cleaned = " ".join(cleaned.split()).strip()
    if len(cleaned) > 200:
        cleaned = cleaned[:200]
    return cleaned or "Unknown"


def _confidence(date_ok: bool, amount_ok: bool, has_desc: bool, ambiguous_amount: bool) -> float:
    c = 0.0
    if date_ok:
        c += 0.4
    if amount_ok:
        c += 0.4
    if has_desc:
        c += 0.2
    if ambiguous_amount:
        c -= 0.2
    return max(0.0, min(1.0, c))


def parse_statement(pdf_path: str, source: str = "", timezone: str = "") -> ParseStatementResponse:
    """
    One-and-done: extract content from PDF, parse to transactions, return result.
    Caller must delete pdf_path after this returns.
    """
    warnings: list[str] = []
    default_year = datetime.now().year

    content = extract_all_content(pdf_path)
    pages = len(content)
    total_text_len = sum(len(p.text) for p in content)
    if pages == 0:
        return ParseStatementResponse(
            source=source or "unknown",
            transactions=[],
            warnings=["No pages could be read from the PDF"],
            stats=ParseStats(pages=0, extractedRows=0),
        )

    if total_text_len < 20:
        warnings.append("Scanned PDF suspected; text extraction yielded very little. OCR not enabled for MVP.")

    lines = content_to_lines(content, source)
    detected_source = source or "unknown"
    if not source and content:
        # Optional: detect TD, RBC, BMO from first page text
        first_text = content[0].text.upper()
        if "TD CANADA TRUST" in first_text or "TD BANK" in first_text:
            detected_source = "TD"
        elif "ROYAL BANK" in first_text or "RBC" in first_text:
            detected_source = "RBC"
        elif "BMO " in first_text or "BANK OF MONTREAL" in first_text:
            detected_source = "BMO"

    transactions: list[TransactionOut] = []
    parse_failures = 0

    for line, page_num in lines:
        if _is_likely_header_or_noise(line):
            continue

        date_iso = parse_date_iso(line, default_year)
        amount_cents, is_credit = parse_amount_cents(line)
        date_ok = date_iso is not None
        amount_ok = amount_cents is not None and amount_cents > 0
        ambiguous = False
        if amount_ok and not has_amount(line.replace(",", "")):
            ambiguous = True

        if not date_ok and not amount_ok:
            parse_failures += 1
            continue
        if not date_ok:
            date_iso = datetime.now().strftime("%Y-%m-%d")
        if not amount_ok:
            amount_cents = 0

        title = _normalize_title(line, str(amount_cents) if amount_cents else None)
        has_desc = len(title) > 0 and title != "Unknown"
        conf = _confidence(date_ok, amount_ok, has_desc, ambiguous)

        direction: str = "credit" if is_credit else "debit"
        category = infer_category(title)
        # Merchant: use title if short enough, else None
        merchant = title if len(title) <= 80 else None

        transactions.append(
            TransactionOut(
                dateISO=date_iso or "",
                title=title or "Unknown",
                amountCents=amount_cents or 0,
                direction=direction,
                merchant=merchant,
                category=category,
                confidence=round(conf, 2),
                raw={"line": line, "page": page_num},
            )
        )

    # Deduplicate: same date + amount + normalized title
    seen: set[tuple[str, int, str]] = set()
    unique: list[TransactionOut] = []
    for t in transactions:
        key = (t.dateISO, t.amountCents, t.title.strip().lower()[:80])
        if key in seen:
            continue
        seen.add(key)
        unique.append(t)

    # Sort by date descending (newest first)
    unique.sort(key=lambda t: t.dateISO, reverse=True)

    if len(unique) < 3:
        warnings.append("Low extraction: fewer than 3 transactions parsed.")
    total_candidates = len([l for l, _ in lines if not _is_likely_header_or_noise(l)])
    if total_candidates > 10 and len(unique) / max(1, total_candidates) < 0.3:
        warnings.append("High parse failure rate: many lines could not be parsed as transactions.")

    return ParseStatementResponse(
        source=detected_source,
        transactions=unique,
        warnings=warnings,
        stats=ParseStats(pages=pages, extractedRows=len(unique)),
    )
