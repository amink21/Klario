"""Request/response schemas for the import API."""
from typing import Any, Literal, get_args

from pydantic import BaseModel, Field, field_validator

# Categories matching Klario app
Category = Literal[
    "Food", "Transport", "Subscriptions", "Insurance", "Health",
    "Utilities", "Housing", "Entertainment", "Other"
]
Direction = Literal["debit", "credit"]

_VALID_CATEGORIES = frozenset(get_args(Category))
_VALID_DIRECTIONS = frozenset(get_args(Direction))


class TransactionOut(BaseModel):
    dateISO: str = Field(..., description="YYYY-MM-DD")
    title: str
    amountCents: int
    direction: Direction
    merchant: str | None = None
    category: Category = "Other"
    confidence: float = Field(..., ge=0, le=1)
    raw: dict[str, Any] = Field(..., description="e.g. line, page")


class ParseStats(BaseModel):
    pages: int = 0
    extractedRows: int = 0


class ParseStatementResponse(BaseModel):
    source: str = "unknown"
    transactions: list[TransactionOut] = []
    warnings: list[str] = []
    stats: ParseStats = Field(default_factory=ParseStats)


# --- Gemini / Supabase-ready response (no raw, fixed source) ---

class GeminiTransactionOut(BaseModel):
    """Single transaction for Supabase; amountCents is always absolute; direction indicates sign."""
    dateISO: str = Field(..., description="YYYY-MM-DD")
    title: str
    amountCents: int = Field(..., ge=0, description="Absolute value in cents")
    direction: Direction
    category: Category = "Other"
    merchant: str | None = None
    source: str = "statement_import"
    confidence: float = Field(..., ge=0, le=1)

    @field_validator("category", mode="before")
    @classmethod
    def coerce_category(cls, v: Any) -> str:
        if v in _VALID_CATEGORIES:
            return v
        return "Other"

    @field_validator("direction", mode="before")
    @classmethod
    def coerce_direction(cls, v: Any) -> str:
        if v in _VALID_DIRECTIONS:
            return v
        s = (v or "").strip().lower()
        return "credit" if s == "credit" else "debit"


class GeminiStats(BaseModel):
    """Metadata returned with PDF parse response (pages count, model name)."""
    pages: int | None = None
    model: str = "gemini-2.0-flash"


class GeminiParseResponse(BaseModel):
    """Response from Gemini statement parsing; Supabase-ready."""
    transactions: list[GeminiTransactionOut] = []
    warnings: list[str] = []
    stats: GeminiStats = Field(default_factory=GeminiStats)


# --- Daily brief (morning brief) ---

class UpcomingItemBrief(BaseModel):
    title: str
    nextDueISO: str


class DailyBriefRequest(BaseModel):
    """Input for AI daily brief; matches app DailyBriefInput."""
    upcomingItems: list[UpcomingItemBrief] = []
    dueSoonCount: int = 0
    forecastAmount: int = 0
    yesterdaySpend: int = 0
    topSpendCategory: str = "Other"


class DailyBriefResponse(BaseModel):
    lines: list[str] = Field(..., max_length=4, min_length=1)
