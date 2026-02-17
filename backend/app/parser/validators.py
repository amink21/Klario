"""Validation helpers for Gemini-parsed statement response: date, amount, category."""
import re
from datetime import datetime
from typing import get_args

from app.schemas import Category, Direction

# YYYY-MM-DD
DATE_ISO_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Allowed categories/directions (must match schemas.py)
CATEGORY_SET = set(get_args(Category))
DIRECTION_SET = set(get_args(Direction))


def validate_date_iso(value: str) -> str:
    """Ensure date is YYYY-MM-DD and valid. Returns normalized date or raises ValueError."""
    s = (value or "").strip()
    if not DATE_ISO_PATTERN.match(s):
        raise ValueError(f"dateISO must be YYYY-MM-DD, got: {value!r}")
    try:
        y, m, d = int(s[:4]), int(s[5:7]), int(s[8:10])
        datetime(y, m, d)
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid date {value!r}: {e}") from e
    return s


def validate_amount_cents(value: int) -> int:
    """Ensure amountCents is a non-negative integer. Returns value or raises ValueError."""
    if not isinstance(value, int):
        raise ValueError(f"amountCents must be int, got {type(value).__name__}")
    if value < 0:
        raise ValueError("amountCents must be >= 0 (use direction for sign)")
    return value


def validate_category(value: str) -> Category:
    """Ensure category is one of the allowed enum values. Returns Category or raises ValueError."""
    s = (value or "Other").strip()
    if s not in CATEGORY_SET:
        raise ValueError(f"category must be one of {sorted(CATEGORY_SET)}, got {value!r}")
    return s  # type: ignore[return-value]


def validate_direction(value: str) -> Direction:
    """Ensure direction is 'debit' or 'credit'. Returns Direction or raises ValueError."""
    s = (value or "").strip().lower()
    if s not in DIRECTION_SET:
        raise ValueError(f"direction must be 'debit' or 'credit', got {value!r}")
    return s  # type: ignore[return-value]
