# Klovio Import API (Backend)

One-and-done PDF statement parsing for the Klovio app. The app uploads a PDF; the server parses it and returns a list of transactions for client review. **The PDF is never stored**—temp files are deleted immediately after parsing. The app writes confirmed transactions to Supabase from the client.

**Do you need to run this backend?** Yes, if you use **PDF import (Gemini)** in the app. The app sends the PDF to this backend; the backend calls Gemini and returns transactions. Without the backend running, PDF import will fail.

**What is the import key?** `IMPORT_API_KEY` / `X-KLOVIO-IMPORT-KEY` is **optional**. If you don’t set `IMPORT_API_KEY` in the backend, you don’t need any import key—the app and curl examples work without that header. Set it only when you want to lock the import endpoints behind a secret key.

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

### GET /routes

Returns a list of registered routes. Use this to confirm your Render deploy has the latest code (you should see `"/ai/daily-brief"` in the list). If you get **404** on `POST /ai/daily-brief`, redeploy the backend (see below).

### POST /imports/statement/parse

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): PDF statement file
  - `source` (optional): e.g. `TD`, `RBC`, `BMO` (helps parsing)
  - `timezone` (optional): e.g. `America/Montreal`
- **Headers:** `X-KLOVIO-IMPORT-KEY` only if you set `IMPORT_API_KEY` in the backend (otherwise omit).
- **Response:** JSON with `source`, `transactions[]`, `warnings[]`, `stats`
- **File handling:** Max size 15MB (configurable). Temp file is created, parsed, then deleted. No storage.

Transactions are returned for **client review**. The app will later insert confirmed transactions into Supabase; this API does not touch Supabase.

### POST /ai/daily-brief

- **Content-Type:** `application/json`
- **Body:** `{ "upcomingItems": [...], "dueSoonCount", "forecastAmount", "yesterdaySpend", "topSpendCategory" }` (same as app `DailyBriefInput`)
- **Headers:** `X-KLOVIO-IMPORT-KEY` only if you set `IMPORT_API_KEY` in the backend
- **Response:** `{ "lines": ["line1", "line2", ...] }` (1–4 short summary lines)
- The Gemini API key is read from the **server** env (`GEMINI_API_KEY` or `GOOGLE_API_KEY` on Render). The app does not send or store the key.

### POST /imports/statement/parse-gemini

- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): PDF bank statement
  - `timezone` (optional): e.g. `America/Montreal` (default)
- **Headers:** `X-KLOVIO-IMPORT-KEY` only if you set `IMPORT_API_KEY` in the backend (otherwise omit).
- **Response:** Supabase-ready JSON: `transactions[]` (dateISO, title, amountCents, direction, category, merchant, source, confidence), `warnings[]`, `stats` (pages, model). **No PDF storage**—file is read into memory, sent to Gemini, then discarded.
- **Constraints:** Content-Type `application/pdf` or `application/octet-stream`; max 15MB.

**cURL example (parse-gemini)** — no import key needed if you didn’t set `IMPORT_API_KEY`:

```bash
curl -X POST "http://localhost:8000/imports/statement/parse-gemini" \
  -F "file=@/path/to/statement.pdf" \
  -F "timezone=America/Montreal"
```

## Env vars

**Gemini:** All features that use the Gemini API (PDF parse, morning brief) are served by this backend. The app never reads or sends a Gemini key; set `GEMINI_API_KEY` or `GOOGLE_API_KEY` only in this service’s environment (e.g. Render env vars).

| Variable | Description | Default |
|----------|-------------|---------|
| `IMPORT_API_KEY` | Optional. If set, requests must send header `X-KLOVIO-IMPORT-KEY` with the same value. If unset, no auth (fine for dev). | (none) |
| `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `EXPO_PUBLIC_GOOGLE_API_KEY` | Google Gemini API key (Render env). Backend checks all three. Used for PDF parse and morning brief. Free tier has low rate limits (~15 req/min); 429 = wait or enable billing. | (none) |
| `GEMINI_MODEL` | Gemini model for PDF statement parsing (must support PDF). | `gemini-2.0-flash` |
| `GEMINI_BRIEF_MODEL` | Gemini model for morning brief (text-only). Use 2.5 to match API key. | `gemini-2.5-flash` |
| `MAX_UPLOAD_MB` | Max PDF size in MB. | `15` |
| `RATE_LIMIT_PER_MINUTE` | Per-IP rate limit. | `10` |
| `CORS_ORIGINS` | Comma-separated origins, or `*` for all. | `*` |
| `TIMEZONE` | Default timezone for date parsing. | `America/Montreal` |

## Getting 404 on POST /ai/daily-brief?

The route is in this codebase; a **404** means Render is running an **old deploy** that doesn’t include it.

1. **Redeploy on Render:** Dashboard → your service → **Manual Deploy** → **Deploy latest commit** (or push your latest code and let Render auto-deploy).
2. **Check routes:** After deploy, open `https://your-service.onrender.com/routes` in a browser. You should see `"/ai/daily-brief"` in the list. If not, the deploy didn’t pick up the latest code (check branch and root directory in Render settings).
3. Set **Root Directory** to `backend` (or wherever `app/main.py` lives) if your repo root is the whole app.

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

- **Import key:** You can skip it. Don’t set `IMPORT_API_KEY` and don’t send `X-KLOVIO-IMPORT-KEY`; the backend won’t require it.
- **From your phone:** Use your PC’s IP and port 8000 in the app’s `EXPO_PUBLIC_IMPORT_API_URL` (e.g. `http://192.168.2.25:8000`), and ensure the backend is running on that machine.

## Key expired or invalid?

If you see **"API key expired. Please renew the API key"** or **400 INVALID_ARGUMENT**:

1. **Create a new API key** at [Google AI Studio](https://aistudio.google.com/apikey) (the old one cannot be renewed).
2. In **Render**: Dashboard → your service → **Environment** → set `GEMINI_API_KEY` to the new key (or edit the existing variable). Remove any extra spaces or line breaks.
3. **Redeploy** the service (Manual Deploy → Deploy latest commit, or push a new commit) so the new env is loaded.
4. Wait for the deploy to finish, then try PDF import again.

The app never sees your key; only this backend uses it. If the key is correct in Render but you still get "expired", the key was revoked or expired by Google—create a new one.

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

## 429 Too Many Requests (Gemini rate limit)

If you see **429** from `POST /ai/daily-brief` or from PDF parse, Google’s Gemini API is rate-limiting you (free tier is ~15 requests/minute). The backend caches daily-brief responses per day per payload, so repeated opens of the morning brief usually hit the cache. If you still hit 429:

- Wait a minute and try again.
- Enable billing at [Google AI](https://ai.google.dev) for higher quotas.
- Avoid opening the brief or importing PDFs many times in a short period.

## cURL example

```bash
curl -X POST "http://localhost:8000/imports/statement/parse" \
  -H "X-KLOVIO-IMPORT-KEY: your-secret-key" \
  -F "file=@statement.pdf" \
  -F "source=TD" \
  -F "timezone=America/Montreal"
```

## Security / abuse

- **API key:** Set `IMPORT_API_KEY`; client must send `X-KLOVIO-IMPORT-KEY` with the same value.
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
