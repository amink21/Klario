# Klario

A calm, modern **life & money** app: track spending, reminders, subscriptions, and get a daily morning brief. Built with Expo (React Native), Supabase, and an optional FastAPI backend for AI-powered PDF statement import.

---

## Features

| Area | What it does |
|------|----------------|
| **Spend** | Log expenses and income, view by month, import from CSV or paste. |
| **Import from statement** | Upload a bank/credit PDF; AI (OpenRouter + Gemini) extracts transactions and adds them in one tap. |
| **Reminders & items** | Life items with due dates, amounts, and cadence (one-time, monthly, yearly). Local notifications for upcoming and overdue items. |
| **Subscriptions** | Track recurring subscriptions; optional AI detection from statements. |
| **Morning brief** | Daily summary (AI via backend): overdue count, payments due this week, 30-day forecast, yesterday’s spend. Deterministic fallback if AI fails. |
| **Settings** | Morning brief on/off and time, due-item reminders, Apple Sign-In, Supabase sync. |

---

## Tech stack

| Layer | Tech |
|-------|------|
| **App** | Expo SDK 54, React Native, Expo Router, TypeScript, Zustand, React Hook Form, Zod |
| **Auth** | Supabase Auth (OAuth + optional native Apple Sign-In) |
| **Data** | Supabase (optional sync); otherwise local AsyncStorage |
| **Backend** | FastAPI (Python) — PDF parsing via OpenRouter (Gemini 2.5 Flash), daily brief via Gemini |
| **Deploy** | EAS Build (iOS/Android, TestFlight), Render (backend) |

---

## Project structure

```
Life_App/
├── app/                    # Expo Router screens
│   ├── (tabs)/              # Tab screens: today, money, items
│   ├── settings.tsx
│   └── _layout.tsx
├── components/              # Shared UI (modals, forms, theme)
├── constants/               # Theme, colors
├── lib/                     # Core logic
│   ├── store.ts             # Zustand state
│   ├── supabase.ts          # Supabase client
│   ├── geminiBackend.ts     # Backend URL & availability
│   ├── geminiImport.ts      # PDF import API client
│   ├── brief/               # Morning brief fallback (deterministic)
│   ├── ai/                  # Daily brief (AI + fallback)
│   └── ...
├── backend/                 # FastAPI service
│   ├── app/
│   │   ├── main.py          # Routes: health, parse, parse-gemini, daily-brief
│   │   ├── gemini_client.py # OpenRouter PDF + Gemini daily brief
│   │   ├── config.py        # Env (OPENROUTER_API_KEY, GEMINI_API_KEY, etc.)
│   │   └── parser/          # PDF parsing (heuristics, prompts)
│   └── requirements.txt
├── .env                     # App env (see below)
├── eas.json                 # EAS Build profiles + env for TestFlight
└── package.json
```

---

## Environment variables

### App (`.env` in project root)

Used when running `npx expo start` and when building with EAS (if not overridden in `eas.json`).

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes (if using Supabase) | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes (if using Supabase) | Supabase anon key |
| `EXPO_PUBLIC_IMPORT_API_URL` | For PDF import | Backend base URL (e.g. `https://klario.onrender.com`) |
| `EXPO_PUBLIC_IMPORT_API_KEY` | Optional | Sent as `X-KLARIO-IMPORT-KEY` if backend has `IMPORT_API_KEY` set |

- **Local dev:** Put these in `.env` and restart Expo after changes: `npx expo start -c`.
- **TestFlight / EAS:** Set `EXPO_PUBLIC_IMPORT_API_URL` (and others) in `eas.json` under the build profile `env`, or in EAS Dashboard → Project → Environment variables, so the built app has the correct backend URL.

### Backend (Render or local)

Set these in **Render Dashboard → Environment** (or in a backend `.env` when running locally).

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | For PDF import | OpenRouter API key (PDF uses OpenRouter Gemini 2.5 Flash) |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | For morning brief | Used only for the daily brief AI endpoint |
| `IMPORT_API_KEY` | Optional | If set, app must send same value as `X-KLARIO-IMPORT-KEY` |
| `MAX_UPLOAD_MB` | Optional | Max PDF size in MB (default 15) |
| `RATE_LIMIT_PER_MINUTE` | Optional | Per-IP limit (default 10) |
| `CORS_ORIGINS` | Optional | Comma-separated origins; `*` for allow all |

**Important:** Render env vars are for the **backend only**. The app does not read them. The app gets the backend URL from **its own** env (`EXPO_PUBLIC_IMPORT_API_URL` in `.env` or EAS).

---

## Running locally

### App

```bash
npm install
npx expo start
```

Then open in simulator/device or press `w` for web. Use `npx expo start -c` to clear cache after changing `.env`.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Set `OPENROUTER_API_KEY` (and optionally `GEMINI_API_KEY`) in `backend/.env` or your shell. Point the app’s `EXPO_PUBLIC_IMPORT_API_URL` to `http://localhost:8000` (or your tunnel URL) for local PDF import and daily brief.

---

## Building for TestFlight

1. Configure EAS and log in: `eas login`, `eas build:configure` if needed.
2. Ensure `eas.json` has the right `env` for the profile you use (e.g. `production`):

   ```json
   "production": {
     "autoIncrement": true,
     "env": { "EXPO_PUBLIC_IMPORT_API_URL": "https://klario.onrender.com" }
   }
   ```

3. Build and submit:

   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --profile production
   ```

The built app will have the backend URL baked in, so PDF import and morning brief work in TestFlight without a local `.env`.

---

## Backend API (summary)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/routes` | List routes |
| POST | `/imports/statement/parse` | Parse PDF with heuristics (no AI) |
| POST | `/imports/statement/parse-gemini` | Parse PDF with OpenRouter (Gemini 2.5 Flash); returns JSON transactions |
| POST | `/ai/daily-brief` | Generate morning brief (Gemini); returns `{ "lines": ["...", ...] }` |

PDF import uses **OpenRouter only** (direct Gemini is commented out in the backend). Morning brief uses **Gemini** via `GEMINI_API_KEY` on the server.

---

## License

Private. All rights reserved.
