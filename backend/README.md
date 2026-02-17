# Klario Import API (Backend)

One-and-done PDF statement parsing for the Klario app. The app uploads a PDF; the server parses it and returns a list of transactions for client review. **The PDF is never stored**—temp files are deleted immediately after parsing. The app writes confirmed transactions to Supabase from the client.

**Do you need to run this backend?** Yes, if you use **PDF import (Gemini)** in the app. The app sends the PDF to this backend; the backend calls Gemini and returns transactions. Without the backend running, PDF import will fail.

**What is the import key?** `IMPORT_API_KEY` / `X-KLARIO-IMPORT-KEY` is **optional**. If you don’t set `IMPORT_API_KEY` in the backend, you don’t need any import key—the app and curl examples work without that header. Set it only when you want to lock the import endpoints behind a secret key.

## Tech stack

- Python 3.11+
- FastAPI + Uvicorn
- pdfplumber (tables + text), PyMuPDF (fitz) as fallback for legacy parse
- **google-genai** for Gemini-based parsing (`/imports/statement/parse-gemini`); PDF read into memory only, no disk
- tempfile for safe temp PDF handling on legacy parse; no persistent statement storage

## Project structure

```
backend/
  app/
    main.py              # FastAPI app, routes, auth, rate limit
    config.py            # Env config
    schemas.py           # Pydantic request/response (incl. GeminiParseResponse)
    gemini_client.py     # Gemini API call for parse-gemini (no PDF storage)
    parser/
      statement_parser.py  # Orchestrates parse pipeline (legacy)
      pdf_text.py          # pdfplumber + fitz extraction
      heuristics.py        # Date/amount/category rules
      gemini_prompt.py     # Strict JSON prompt for Gemini statement parsing
      validators.py        # Date/amount/category validation helpers
    utils/
      files.py             # Temp PDF validate/save/cleanup
      logging.py
  requirements.txt
  README.md
```

## Endpoints

### GET /health

Returns `{ "ok": true }`. No auth.

### POST /imports/statement/parse

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): PDF statement file
  - `source` (optional): e.g. `TD`, `RBC`, `BMO` (helps parsing)
  - `timezone` (optional): e.g. `America/Montreal`
- **Headers:** `X-KLARIO-IMPORT-KEY` only if you set `IMPORT_API_KEY` in the backend (otherwise omit).
- **Response:** JSON with `source`, `transactions[]`, `warnings[]`, `stats`
- **File handling:** Max size 15MB (configurable). Temp file is created, parsed, then deleted. No storage.

Transactions are returned for **client review**. The app will later insert confirmed transactions into Supabase; this API does not touch Supabase.

### POST /imports/statement/parse-gemini

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): PDF bank statement
  - `timezone` (optional): e.g. `America/Montreal` (default)
- **Headers:** `X-KLARIO-IMPORT-KEY` only if you set `IMPORT_API_KEY` in the backend (otherwise omit).
- **Response:** Supabase-ready JSON: `transactions[]` (dateISO, title, amountCents, direction, category, merchant, source, confidence), `warnings[]`, `stats` (pages, model). **No PDF storage**—file is read into memory, sent to Gemini, then discarded.
- **Constraints:** Content-Type `application/pdf` or `application/octet-stream`; max 15MB.

**cURL example (parse-gemini)** — no import key needed if you didn’t set `IMPORT_API_KEY`:

```bash
curl -X POST "http://localhost:8000/imports/statement/parse-gemini" \
  -F "file=@/path/to/statement.pdf" \
  -F "timezone=America/Montreal"
```

## Env vars

| Variable | Description | Default |
|----------|-------------|---------|
| `IMPORT_API_KEY` | Optional. If set, requests must send header `X-KLARIO-IMPORT-KEY` with the same value. If unset, no auth (fine for dev). | (none) |
| `GEMINI_API_KEY` | Google Gemini API key for `/imports/statement/parse-gemini`. | (none) |
| `GEMINI_MODEL` | Gemini model for statement parsing. | `gemini-2.0-flash` |
| `MAX_UPLOAD_MB` | Max PDF size in MB. | `15` |
| `RATE_LIMIT_PER_MINUTE` | Per-IP rate limit. | `10` |
| `CORS_ORIGINS` | Comma-separated origins, or `*` for all. | `*` |
| `TIMEZONE` | Default timezone for date parsing. | `America/Montreal` |

## How to start the backend (required for Gemini PDF import)

1. Open a terminal in the project.
2. Go into the backend folder and use a virtualenv:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

3. Set your Gemini API key (required for PDF import):

```bash
set GEMINI_API_KEY=your-gemini-api-key   # Windows
# export GEMINI_API_KEY=your-gemini-api-key   # macOS/Linux
```

4. Start the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see something like `Uvicorn running on http://0.0.0.0:8000`. Keep this terminal open while you use PDF import in the app.

- **Import key:** You can skip it. Don’t set `IMPORT_API_KEY` and don’t send `X-KLARIO-IMPORT-KEY`; the backend won’t require it.
- **From your phone:** Use your PC’s IP and port 8000 in the app’s `EXPO_PUBLIC_IMPORT_API_URL` (e.g. `http://192.168.2.25:8000`), and ensure the backend is running on that machine.

## Verify Gemini API key

**1) Test the key directly** (no PDF; proves the key works):

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: YOUR_GEMINI_API_KEY" \
  -X POST \
  -d "{\"contents\":[{\"parts\":[{\"text\":\"Say hello in one word\"}]}]}"
```

Replace `YOUR_GEMINI_API_KEY` with your key. You should get JSON with `"candidates"` and generated text. If the key is wrong you get `401` or `403`.

**2) Test our pipeline (PDF → auto-categorized transactions)** — this uses the key inside the backend:

```bash
curl -X POST "http://localhost:8000/imports/statement/parse-gemini" \
  -F "file=@/path/to/your/statement.pdf" \
  -F "timezone=America/Montreal"
```

- Backend must be running with `GEMINI_API_KEY` set. No import key needed unless you set `IMPORT_API_KEY`.
- Response is JSON: `transactions[]` with `dateISO`, `title`, `amountCents`, `direction`, **`category`** (auto-categorized), `merchant`, `confidence`, plus `warnings` and `stats`.

So: (1) confirms the key; (2) confirms we’re using it and returning categorized transactions.

## cURL example

```bash
curl -X POST "http://localhost:8000/imports/statement/parse" \
  -H "X-KLARIO-IMPORT-KEY: your-secret-key" \
  -F "file=@statement.pdf" \
  -F "source=TD" \
  -F "timezone=America/Montreal"
```

## Security / abuse

- **API key:** Set `IMPORT_API_KEY`; client must send `X-KLARIO-IMPORT-KEY` with the same value.
- **Rate limit:** In-memory per-IP limit (e.g. 10 requests/minute). Resets every minute.
- **File size:** Rejects uploads larger than `MAX_UPLOAD_MB` with **413 Payload Too Large**.
- **CORS:** Configure `CORS_ORIGINS` for production (e.g. your app’s origin).

Later you can replace the API key with Supabase JWT verification.

## Scanned PDFs / OCR (optional, not MVP)

If the PDF is a scanned image, pdfplumber/PyMuPDF may extract little or no text. For MVP we do **not** require OCR. To add later:

- **pytesseract** + **pdf2image**: render each page to image, run OCR, feed text into the same parsing pipeline.
- Stub: you can detect “very low text length” and add a warning like “Scanned PDF suspected; OCR not enabled.”

## Supabase (transactions only, not in this service)

This API **does not** insert into Supabase. The app receives the transaction list, lets the user review/edit, then writes to Supabase from the client.

Example schema for the **transactions** table (for reference; create in Supabase as needed):

```sql
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  merchant text,
  amount_cents integer not null,
  direction text not null check (direction in ('debit', 'credit')),
  category text not null default 'Other',
  date date not null,
  created_at timestamptz not null default now()
);

create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_date on public.transactions(date);
```
