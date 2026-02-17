"""Deterministic heuristics: category mapping, date/amount patterns. No AI."""
import re
from datetime import datetime
from typing import Literal

# Categories matching Klario app
Category = Literal[
    "Food", "Transport", "Subscriptions", "Insurance", "Health",
    "Utilities", "Housing", "Entertainment", "Other"
]

# Keyword -> category (lowercase keys, case-insensitive match)
CATEGORY_KEYWORDS: list[tuple[list[str], str]] = [
    (["coffee", "starbucks", "tim hortons", "restaurant", "mcdonald", "burger", "pizza", "uber eats", "doordash", "skip", "groceries", "supermarket", "walmart", "food basics", "metro", "sobeys", "freshco", "lunch", "dinner", "cafe", "espresso"], "Food"),
    (["uber", "lyft", "gas", "shell", "esso", "petro", "parking", "transit", "bus", "train", "taxi", "fuel", "chevron"], "Transport"),
    (["netflix", "spotify", "disney", "apple music", "youtube", "gym", "fitness", "subscription", "membership", "amazon prime"], "Subscriptions"),
    (["insurance", "premium", "policy"], "Insurance"),
    (["dentist", "pharmacy", "shoppers", "rexall", "doctor", "medical", "health"], "Health"),
    (["hydro", "electric", "water", "internet", "phone bill", "utility", "utilities", "gas bill"], "Utilities"),
    (["rent", "mortgage", "housing"], "Housing"),
    (["cinema", "movies", "games", "entertainment"], "Entertainment"),
]

# Date patterns: ISO, DD MMM, MM/DD, DD/MM, etc.
DATE_ISO = re.compile(r"\b(20\d{2})-(\d{2})-(\d{2})\b")
DATE_DD_MMM = re.compile(r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\b", re.I)
DATE_MM_DD = re.compile(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b")
DATE_DD_MM = re.compile(r"\b(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?\b")

MONTH_NAMES = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

# Amount: -12.34, 12.34, (12.34), 1,234.56, CR/DR
AMOUNT_PATTERN = re.compile(
    r"(?:^|[\s(])(?:CR|DR)?\s*([-()]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:\)|CR|DR)?(?:\s|$)",
    re.I
)
# Simpler: last number that looks like money
AMOUNT_SIMPLE = re.compile(r"[-]?(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\b")


def infer_category(description: str) -> Category:
    """Map description to category using keyword rules. Default Other."""
    lower = (description or "").lower()
    for keywords, cat in CATEGORY_KEYWORDS:
        for kw in keywords:
            if kw in lower:
                return cat  # type: ignore
    return "Other"


def parse_date_iso(match: str, default_year: int | None = None) -> str | None:
    """Parse a date string to YYYY-MM-DD. Returns None if invalid."""
    year = default_year or datetime.now().year
    m = DATE_ISO.search(match)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = DATE_DD_MMM.search(match)
    if m:
        day = int(m.group(1))
        mon = MONTH_NAMES.get(m.group(2).lower()[:3], 0)
        if mon and 1 <= day <= 31:
            return f"{year}-{mon:02d}-{day:02d}"
    m = DATE_MM_DD.search(match)
    if m:
        mon, day = int(m.group(1)), int(m.group(2))
        yr = m.group(3)
        if yr:
            year = int(yr) if len(yr) == 4 else 2000 + int(yr)
        if 1 <= mon <= 12 and 1 <= day <= 31:
            return f"{year}-{mon:02d}-{day:02d}"
    m = DATE_DD_MM.search(match)
    if m:
        d, mon = int(m.group(1)), int(m.group(2))
        yr = m.group(3)
        if yr:
            year = int(yr) if len(yr) == 4 else 2000 + int(yr)
        if 1 <= mon <= 12 and 1 <= d <= 31:
            return f"{year}-{mon:02d}-{d:02d}"
    return None


def parse_amount_cents(line: str) -> tuple[int | None, bool]:
    """
    Extract amount in cents from line. Returns (cents, is_credit).
    Credit: positive amount, CR, or amount in parentheses. Debit: negative or DR.
    """
    line_clean = line.replace(",", "")
    # Prefer explicit CR/DR
    is_credit = " CR" in line.upper() or "(CR)" in line.upper() or line.strip().endswith("CR")
    is_debit = " DR" in line.upper() or "(DR)" in line.upper() or line.strip().endswith("DR")

    # Find last money-like number (often the amount column)
    for m in reversed(list(AMOUNT_SIMPLE.finditer(line_clean))):
        raw = m.group(1).replace(",", "")
        if "(" in line[max(0, m.start() - 2) : m.start() + 1] or ")" in line[m.end() - 1 : m.end() + 2]:
            is_credit = True
        try:
            value = float(raw)
            if value < 0:
                is_credit = True
                value = abs(value)
            cents = round(value * 100)
            if is_debit and not is_credit:
                return cents, False
            if is_credit:
                return cents, True
            # Default: negative in line -> credit (refund), positive -> debit
            if "-" in line[: m.start()] or line.strip().startswith("-"):
                return cents, True
            return cents, False
        except ValueError:
            continue

    for m in AMOUNT_PATTERN.finditer(line_clean):
        s = m.group(1).replace(" ", "").replace("(", "-").replace(")", "")
        if s.startswith("(") or s.endswith(")"):
            s = s.replace("(", "").replace(")", "")
            is_credit = True
        try:
            value = float(s)
            if value < 0:
                value = abs(value)
                is_credit = True
            cents = round(value * 100)
            return cents, is_credit
        except ValueError:
            continue
    return None, False


def has_date(line: str) -> bool:
    return bool(DATE_ISO.search(line) or DATE_DD_MMM.search(line) or DATE_MM_DD.search(line) or DATE_DD_MM.search(line))


def has_amount(line: str) -> bool:
    return bool(AMOUNT_SIMPLE.search(line) or AMOUNT_PATTERN.search(line))
