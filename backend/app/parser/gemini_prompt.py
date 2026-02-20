"""Strict prompt for Gemini to extract transactions from a bank statement PDF as JSON only."""

GEMINI_SYSTEM_INSTRUCTION = """You are a precise bank statement parser. Your only output must be valid JSON.
Return ONLY a single JSON object. Do not wrap in markdown code fences. No commentary, no explanation."""

# Categories we allow (exact strings)
ALLOWED_CATEGORIES = (
    "Food", "Transport", "Subscriptions", "Insurance", "Health",
    "Utilities", "Housing", "Entertainment", "Other"
)


def build_prompt(timezone: str = "America/Montreal") -> str:
    return f"""You must extract EVERY transaction from this bank or credit card statement PDF. Do not skip any.

Look for the transaction table (often with columns like TRANSACTION DATE, POSTING DATE, ACTIVITY DESCRIPTION, AMOUNT). Include every row that has a date, a description, and an amount. Typically there are 5 to 30+ transactions per page—extract all of them. Ignore only: section headers, "Previous balance", "Total new balance", "Payment information", and contact/footer text.

Return ONLY valid JSON in this exact shape. Do not wrap in markdown. No commentary.

{{
  "transactions": [
    {{
      "dateISO": "YYYY-MM-DD",
      "title": "cleaned description",
      "amountCents": 1234,
      "direction": "debit" or "credit",
      "category": "Food"|"Transport"|"Subscriptions"|"Insurance"|"Health"|"Utilities"|"Housing"|"Entertainment"|"Other",
      "merchant": "string or null",
      "source": "statement_import",
      "confidence": 0.0 to 1.0
    }}
  ],
  "warnings": ["optional list of strings"],
  "stats": {{ "pages": number or null, "model": "gemini-2.5-flash" }}
}}

Rules:
- Include every transaction row. Missing rows is a failure—double-check the table.
- dateISO: Normalize all dates to YYYY-MM-DD. If only month/day (e.g. JAN 7, JAN 13), infer year from statement period or use current year. Timezone: {timezone}.
- amountCents: Always a positive integer (cents). Use direction for sign: debit = money out (purchases, payments), credit = money in (refunds, deposits).
- title: Full activity/description text; trim extra spaces.
- category: Use only one of: Food, Transport, Subscriptions, Insurance, Health, Utilities, Housing, Entertainment, Other. If uncertain, use "Other".
- merchant: Short merchant name if clear, else null.
- source: Always "statement_import".
- confidence: 1.0 if clear; lower (e.g. 0.7) if inferred.

Example output (shape only):
{{
  "transactions": [
    {{ "dateISO": "2026-01-07", "title": "CANEX CARLING BLDG 5", "amountCents": 310, "direction": "debit", "category": "Other", "merchant": "CANEX", "source": "statement_import", "confidence": 0.95 }},
    {{ "dateISO": "2026-01-15", "title": "PAYMENT - THANK YOU", "amountCents": 12715, "direction": "credit", "category": "Other", "merchant": null, "source": "statement_import", "confidence": 1.0 }}
  ],
  "warnings": [],
  "stats": {{ "pages": 1, "model": "gemini-2.5-flash" }}
}}

Return ONLY the JSON object, no other text."""
