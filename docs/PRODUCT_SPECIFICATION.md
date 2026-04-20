# Klovio — Full Product Specification

*Reverse-engineered from the Life_App codebase. Last updated: March 2025.*

---

## 1. Overview

**Klovio** is a calm, modern **life & money** mobile app that helps users:

- Track **reminders and bills** (life items) with due dates and cadences
- Log **spending and income** (transactions) with categories
- Manage **subscriptions** (recurring monthly/yearly)
- Get a **daily morning brief** (AI-generated summary)
- **Import transactions** from PDF bank/credit statements or CSV/text files
- Use **Smart Input** (natural language) to add reminders or spending in one tap
- Use **Quick Add** (Back Tap / deep link) to add entries from outside the app

The app is **Expo (React Native)** with optional **Supabase** sync and a **FastAPI** backend for AI-powered PDF parsing and daily brief. It targets **iOS** and **Android** (EAS Build, TestFlight).

---

## 2. User-Facing Features

### 2.1 Onboarding

- **First launch**: Full-screen onboarding with slides (Welcome, Ask Anything, Import from PDF, Quick Add with Back Tap, Simple & Personal, Sign in to keep your data).
- **Sign-in slide**: Optional account creation (email/password or Sign in with Apple) to sync data; user can skip and use app locally.
- **Completion**: `hasOnboarded` stored; app then shows **StartupAnimation** once, then main tab UI.
- **Reset**: Settings → “Show onboarding again” clears onboarding flag; user must fully close and reopen app to see onboarding again.

### 2.2 Today Tab

- **Date header**: Displays current view date; tap opens **DatePickerSheet** to change date (for context; main data is still “today” relative).
- **Smart Input bar**: Natural-language input (e.g. “Rent due March 1”, “Starbucks $5.50”). Submits to Smart Input pipeline; may create reminder, transaction, or both, or open **SmartInputReviewSheet** for ambiguous input.
- **Your load (Life status)**: Card showing status — **Stable** / **Watch** / **Action Needed** — based on count of items due in 7 days and 30-day forecast. Short description for each state.
- **Coming up**: Filter pills (Today, 7 days, 14 days, 30 days). **UpcomingList** of life items in that window; “View all reminders” links to Items tab. Per-item: tap to edit in **AddItemSheet**, swipe/actions to mark done/undone.
- **Upcoming money**: Card with total due in next 30 days (from life items only). Tap to expand/collapse breakdown by category.
- **At a glance**:
  - Reminders: Completed count, Overdue count.
  - Spending: Next 30 days total, Due in 7 days, Yesterday spend, This month spend.
- **Add Item**: FAB/sheet entry to add or edit a life item (title, category, amount, cadence, next due, reminder lead time, due time, notes). Recurring items: “Mark done” advances next due by cadence; one-time items can be marked completed.
- **Pull to refresh**: Reloads store from storage/Supabase.

### 2.3 Money Tab (Spend)

- **Month picker**: Sticky header with previous/next month; future months disabled.
- **Hero card**: Month-to-date spend for selected month.
- **Smart Input bar**: Same as Today; context “money” for Smart Input.
- **Import from statement**:
  - **Pick file**: PDF, CSV, or text. PDFs are sent to backend **parse-gemini** (OpenRouter/Gemini); CSV/text parsed client-side. New transactions are deduped by (dateISO, title, amount) and added. Success toast with count.
  - **Paste / “Analyze & add from text”**: Present in code but **commented out** in UI (see Hidden/Partial).
- **Recent**: Collapsible list of 6 most recent transactions; swipe to delete, tap to open **Edit Transaction** screen.
- **Spending breakdown**: By category for selected month; tap category to expand in-line list of transactions. “View all spends” opens full-screen modal with category filter pills and full list.
- **Insights grid**: Cards for: Avg per day, Transactions count, Top category, Largest spend, Vs last month %, Recurring (subs/month), Avg transaction, Categories used, Projected month end, Most active category, Smallest spend (when data exists).
- **Add transaction**: Via sheet; supports edit. Transaction detail at `/transaction/[id]` (edit/delete).
- **Pull to refresh**: Reloads data.

### 2.4 Items Tab (Reminders)

- **Smart Input bar**: Context “items”; creates reminders or spending, or both.
- **Filter pills**: All, Today, Overdue, 14 days, Daily, Weekly, Monthly, Yearly, Completed, Cancelled.
- **List**: **SwipeableReminderRow** per item — tap to open **AddItemSheet** (edit), or **ItemDetailsSheet** (view, Mark renewed, Cancel). Swipe to mark done/undone or delete (with confirmation).
- **Item details sheet**: For recurring items, “Mark renewed” advances next due by cadence; “Cancel” sets status to cancelled. Edit opens AddItemSheet.
- **Pull to refresh**: Reloads data.

### 2.5 Settings

- **Account**:
  - If Supabase not configured: Message to add env vars.
  - If signed out: Email/password sign in, Sign up, Sign in with Apple (when available). Support and Privacy policy links.
  - If signed in: “Signed in as {email}”, Sign out, Support, Privacy policy, Delete account (with confirmation; clears data and signs out).
- **Notifications**:
  - **Morning brief**: Toggle; when on, **Brief time** (HH:mm) picker.
  - **Due item reminders**: Toggle for reminder notifications before due dates.
  - **Smart nudges**: Toggle for contextual nudges (spending insights, statement reminders, positive reinforcement).
  - **Default reminder lead time**: Presets 1, 7, 14, 30 days + Custom (1–365). Used for new life items.
  - **Preview notifications**: Code exists but UI is **commented out** (see Hidden/Partial).
- **Quick Add**: Link to **Quick Add setup** screen (Back Tap + Shortcut instructions).
- **Data**: “Clear all data” with confirmation (deletes all items, transactions, subscriptions; resets settings).
- **About**: App name (Klovio), Version, “Show onboarding again”.

Modals: **Privacy policy** (in-app sections), **Support** (mailto with prefilled subjects: Bug report, Feature request, General request, Billing/Account, Other).

### 2.6 Quick Add (Deep Link)

- **Route**: `/quick-add?text=...` (scheme `klovio://quick-add`).
- **Flow**: Runs Smart Input on `text`; executes create reminder/spending; shows toast; redirects to Money tab if only spending, else Today tab.
- **Entry points**: Back Tap (iOS) → Shortcut → “Quick Add to Klovio” → deep link with dictated or typed text; or any app opening `klovio://quick-add?text=...`.

### 2.7 Quick Add Setup

- **Steps (iOS)**: 1) Install Shortcut (opens install URL). 2) Assign Back Tap (Settings → Accessibility → Touch → Back Tap → Triple Tap → Quick Add to Klovio). 3) Test (opens test deep link).
- **Alternatives**: “Home Screen Widget” — modal says “Coming soon”; Siri: “Hey Siri, Quick Add to Klovio” then speak entry.
- **Android**: Message that Back Tap is iOS-only; can still use deep link from another app/shortcut. Test button available.

### 2.8 Transaction Detail

- **Route**: `/transaction/[id]`.
- **Form**: Title, amount, category, date, merchant (optional). Save updates; Delete with confirmation.

### 2.9 Notifications & Deep Links

- **Morning brief**: Scheduled at user-configured time (default 07:00). Tap opens app and **MorningBriefModal** (AI brief lines).
- **Due reminder**: Fired N days before due (and optionally N minutes before due time). Tap opens app and **ReminderCompletedModal** (“Have you completed [title]?”) with Mark complete / Not yet. Mark complete advances recurring or marks one-time completed.
- **Smart nudges**: One contextual nudge scheduled on app open (e.g. spending insight, “import a statement”, positive check-in). Conditions and min days between same nudge type to avoid spam.
- **Deep link data**: `type: 'morning_brief'` → show brief modal; `type: 'due_reminder', itemId` → set reminder modal item; other `itemId` → set deepLinkItemId so Today tab can open item sheet.

---

## 3. Major Components

| Component | Purpose |
|-----------|---------|
| **RootLayout** | Font load, onboarding gate, StartupAnimation, AuthProvider, Stack (tabs, transaction, settings, quick-add, quick-add-setup), MorningBriefModal, ReminderCompletedModal. |
| **TabLayout** | Tabs (Today, Items, Money); custom **SummaryPillBar** as tab bar; header with BearLogo, Settings cog. |
| **SummaryPillBar** | Pill showing: due soon count, active items count, month spend; segments navigate to Today/Items/Money. |
| **OnboardingScreen** | Slide list (Welcome, Ask Anything, Import PDF, Quick Add, Simple & Personal, Sign in); Auth UI on last slide; BearLogo. |
| **StartupAnimation** | One-time animation after first post-onboarding load. |
| **MorningBriefModal** | Fetches AI brief (or fallback), shows 1–4 lines; close button. |
| **ReminderCompletedModal** | “Have you completed [item title]?” — Mark complete (advance/correct) or Not yet. |
| **SmartInputBar** | Text input; onSubmit runs handleSmartInput; shows loading/thinking; status pill (reminder/transaction/both). |
| **SmartInputReviewSheet** | When Smart Input confidence low or ambiguous: show parsed reminder + spending; toggles to include/exclude each; Confirm runs executeSmartActions. |
| **AddItemSheet** | Form: title, category, amount, cadence, next due, due time, remind days/minutes, notes; Create/Update; optional edit item. |
| **AddTransactionSheet** | Form: title, amount, category, date, merchant; Create/Update. |
| **ItemDetailsSheet** | View item; Mark renewed (recurring); Cancel (cancelled); Edit. |
| **DatePickerSheet** | Date picker for “view date” on Today. |
| **UpcomingList** | List of life items in “coming up” window; mark done/undone; tap to edit. |
| **SwipeableTransactionRow** | Transaction row; tap → transaction detail; swipe delete. |
| **SwipeableReminderRow** | Life item row; tap → edit/details; swipe delete / mark done/undone. |
| **PdfExtractingModal** | Shown during PDF import: working / found / error. |
| **Toast** | Temporary message (e.g. “Added 5 transactions”). |
| **BearLogo** | App branding in header. |
| **TabScreenAnimation** | Per-tab entrance animation. |

---

## 4. How the System Works End-to-End

### 4.1 App startup

1. SplashScreen prevented until fonts loaded.
2. **hasOnboarded** read from AsyncStorage; if false → OnboardingScreen (with AuthProvider); on complete → set hasOnboarded, show RootLayoutNav.
3. If onboarded: **load()** from storage (and Supabase if signed in): life items, transactions, subscriptions, settings. If not seeded, default settings applied and data cleared (unless Supabase in use).
4. **Morning brief schedule** updated from settings (time + enabled).
5. **Nudge scheduler** runs once per open (if smart nudges on): picks one nudge type by context, schedules if conditions and min interval met.
6. **Notification response listener** and **getLastNotificationResponseAsync** handle cold start and foreground tap: open brief modal or reminder modal or set deepLinkItemId.
7. **StartupAnimation** plays once then hides.

### 4.2 Data flow

- **State**: Zustand **store** (items, transactions, subscriptions, settings, loaded, modals/deep link ids). All writes go through store actions that persist to **storage** (AsyncStorage and/or Supabase).
- **Storage**: `lib/storage` abstracts get/set for life items, transactions, subscriptions, settings. When Supabase is connected and user signed in, reads/writes sync to Supabase (RLS by user_id).
- **Sync**: No real-time sync; sync on load and on each mutation that calls storage.

### 4.3 Smart Input pipeline

1. User submits text in **SmartInputBar** (context: today / money / items).
2. **handleSmartInput(text, context)**:
   - Local parse (regex/quick rules) first.
   - If not confident or ambiguous → **aiParseSmartInput** (OpenRouter or backend proxy; dev key or server).
   - **mergeParsed** combines local + AI.
   - If **needReview(parsed)** → return `{ action: 'review', parsed }` → **SmartInputReviewSheet**.
   - Else return `{ action: 'done', parsed }` or `{ action: 'error', error }`.
3. **executeSmartActions(parsed, options)** creates life item(s), transaction(s), subscription(s) as per intent; schedules due reminder if enabled.
4. Result reflected in store and UI (toast / status pill).

### 4.4 Morning brief

1. **MorningBriefModal** opens (manual or from notification).
2. Build **DailyBriefInput** from store (upcoming items, due soon count, forecast, yesterday spend, top category, overdue count, due next 7 days).
3. **generateDailyBrief(input)**:
   - Client cache by date + input hash; if hit return cached.
   - Else POST **/ai/daily-brief** to backend (or use client Gemini if configured). Backend caches by (date, payload hash); uses Gemini to produce 1–4 lines.
   - On failure/timeout/invalid: **generateFallbackBrief** (deterministic) on client.
4. Modal shows lines; user dismisses.

### 4.5 PDF import

1. User picks PDF in Money tab.
2. **parsePdfWithGemini(uri)** reads file, POSTs to backend **/imports/statement/parse-gemini** (multipart file + timezone). Optional **X-KLOVIO-IMPORT-KEY** if backend has IMPORT_API_KEY.
3. Backend: rate limit, read PDF into memory, call **parse_pdf_with_gemini** (OpenRouter Gemini 2.5 Flash); return **GeminiParseResponse** (transactions, warnings, stats).
4. Client: dedupe by (dateISO, title, amountCents); exclude already-existing; convert direction to signed amountCents; **addTransactions**; toast; **setLastImportISO** for nudge logic.

### 4.6 Notifications

- **expo-notifications**: Morning brief (daily at brief time), due reminders (scheduled per item with **scheduleDueReminder**), smart nudges (one scheduled per open by **runNudgeScheduler**). Deep link payload: type, itemId.
- **Reminder reschedule**: When user updates due date or remind days, previous reminder cancelled and new one scheduled.

---

## 5. User Flows

### 5.1 New user

1. Open app → Onboarding slides → optional Sign in / Sign up / Apple.
2. Startup animation → Today tab. Optional: add item via Smart Input or Add Item sheet.
3. Settings: enable Morning brief, set time; enable Due reminders; set default remind days; optionally Quick Add setup.

### 5.2 Add reminder

- **Today/Items**: Type “Rent due March 1” in Smart Input → reminder created (and optionally spending if parsed). Or tap Add Item → fill form → Create.
- **Quick Add**: Back Tap → Shortcut → speak or type → same Smart Input path.

### 5.3 Log spending

- **Today/Money**: Type “Starbucks $5.50” in Smart Input → transaction created. Or Money → Add transaction sheet.
- **Import**: Money → Pick file → PDF/CSV/text → transactions added.

### 5.4 Morning routine

- At brief time, notification “Your daily brief”. Tap → app opens → MorningBriefModal with 1–4 lines (overdue, due this week, forecast, yesterday spend).

### 5.5 Due reminder

- N days before due (and optionally N minutes before time): “Reminder: [title] due [date]”. Tap → ReminderCompletedModal → Mark complete (advance or complete) or Not yet.

### 5.6 Edit / delete

- **Transaction**: Money → Recent or breakdown → tap row → /transaction/[id] → edit or Delete.
- **Life item**: Today or Items → tap item → AddItemSheet edit; or ItemDetailsSheet → Mark renewed / Cancel. Swipe delete with confirm.

---

## 6. Architecture

### 6.1 High-level

```
┌─────────────────────────────────────────────────────────────────┐
│  Klovio App (Expo / React Native)                               │
│  - Expo Router (tabs + stack)                                   │
│  - Zustand store ←→ storage (AsyncStorage / Supabase)            │
│  - Smart Input (local + optional OpenRouter/Gemini)              │
│  - Daily brief (backend or client fallback)                      │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               │ HTTPS                         │ Optional sync
               ▼                              ▼
┌──────────────────────────────┐   ┌─────────────────────────────┐
│  Backend (FastAPI on Render) │   │  Supabase                   │
│  - POST /imports/statement/  │   │  - Auth (email, Apple)      │
│    parse | parse-gemini       │   │  - life_items, transactions│
│  - POST /ai/daily-brief       │   │  - subscriptions, settings │
│  - OpenRouter (PDF), Gemini   │   │  - RLS by user_id          │
└──────────────────────────────┘   └─────────────────────────────┘
```

### 6.2 App structure

- **app/**: Expo Router — `_layout.tsx` (root), `(tabs)/` (today, items, money), `settings`, `transaction/[id]`, `quick-add`, `quick-add-setup`.
- **components/**: Shared UI (modals, sheets, bars, rows, theme).
- **lib/**: Store, storage, Supabase client, AI (dailyBrief, schemas, smartInput, subscriptionWaste), brief fallback, notifications, nudges, forecast, date, currency, id, parseStatement, geminiImport, quickAddLinking.
- **contexts/**: AuthContext (Supabase auth).
- **constants/**: Theme (colors, spacing, radius).
- **assets/**: Fonts, images (e.g. bear).

### 6.3 Backend

- **FastAPI**: `/health`, `/routes`, `/imports/statement/parse` (heuristic PDF), `/imports/statement/parse-gemini` (Gemini PDF), `/ai/daily-brief` (Gemini). Rate limit per IP; optional X-KLOVIO-IMPORT-KEY. CORS from env.
- **Optional**: `services/pdf-extract` (Flask) POST /extract with base64 PDF for text extraction (not used by main app flow in repo).

---

## 7. Data Structures

### 7.1 Client types (lib/types.ts)

- **LifeItem**: id, title, category, amountCents?, cadence (one_time | daily | weekly | monthly | yearly), nextDueISO, dueTime?, remindDaysBefore, remindMinutesBefore?, status (active | cancelled | completed), notes?, notificationId?.
- **Transaction**: id, title, amountCents (signed: positive = expense), category, dateISO, merchant?.
- **Subscription**: id, title, amountCents, cadence (monthly | yearly), nextDueISO, detected, aiMeta?.
- **SettingsState**: morningBrief, morningBriefTime?, dueItemReminders, defaultRemindDaysBefore, smartNudges?, hasSeeded?, quickAddEnabled?, quickAddShortcutInstalledConfirmed?, quickAddBackTapConfiguredConfirmed?.

### 7.2 Backend schemas (Pydantic)

- **TransactionOut / GeminiTransactionOut**: dateISO, title, amountCents, direction (debit/credit), category, merchant, source?, confidence.
- **ParseStatementResponse / GeminiParseResponse**: transactions, warnings, stats (pages, model).
- **DailyBriefRequest**: upcomingItems[], dueSoonCount, forecastAmount, yesterdaySpend, topSpendCategory.
- **DailyBriefResponse**: lines[] (1–4 strings).

### 7.3 Supabase (Postgres)

- **life_items**: id, user_id, title, category, amount_cents, cadence, next_due_iso, due_time, remind_days_before, remind_minutes_before?, status, notes, notification_id, created_at. RLS.
- **transactions**: id, user_id, title, amount_cents, category, date_iso, merchant, created_at. RLS.
- **subscriptions**: id, user_id, title, amount_cents, cadence, next_due_iso, detected, ai_meta (jsonb). RLS.
- **settings**: user_id (PK), morning_brief, morning_brief_time, due_item_reminders, default_remind_days_before (1–365), has_seeded, smart_nudges, updated_at. RLS.

Migrations add: morning_brief_time, daily/weekly cadence, default_remind_days_before 1–365, status completed, smart_nudges.

### 7.4 AI / Smart Input schemas (Zod)

- **SmartInputParseResult**: intent (reminder | spending | both | unknown), reminder?, spending?, confidence.
- **Reminder**: title, category, nextDueISO?, dueTime?, cadence?, remindDaysBefore?, remindMinutesBefore?.
- **Spending**: title, category, amountCents?, dateISO?, cadence?.
- Categories: Housing, Utilities, Subscriptions, Food, Transport, Health, Insurance, Entertainment, Other.

---

## 8. Integrations

| Integration | Purpose |
|-------------|---------|
| **Supabase** | Auth (email/password, Apple); optional persistence for life_items, transactions, subscriptions, settings. |
| **Backend (Render)** | PDF parse (OpenRouter Gemini 2.5 Flash), daily brief (Gemini). |
| **OpenRouter** | Smart Input AI (dev); PDF parse on backend. |
| **Google Gemini** | Daily brief on backend; optional client fallback. |
| **Expo Notifications** | Local scheduled: morning brief, due reminders, smart nudges. |
| **expo-apple-authentication** | Sign in with Apple when available. |
| **expo-document-picker** | Pick PDF/CSV/file for import. |
| **expo-file-system** | Read file content for CSV/text import. |
| **EAS** | Build (iOS/Android), submit (e.g. TestFlight). |

### 8.1 Environment variables (app)

- **EXPO_PUBLIC_SUPABASE_URL**, **EXPO_PUBLIC_SUPABASE_ANON_KEY**: Supabase.
- **EXPO_PUBLIC_IMPORT_API_URL**: Backend base (e.g. https://klovio.onrender.com).
- **EXPO_PUBLIC_IMPORT_API_KEY**: Optional; sent as X-KLOVIO-IMPORT-KEY.
- **EXPO_PUBLIC_PDF_EXTRACT_URL**: Optional PDF-extract service.
- **EXPO_PUBLIC_OPENROUTER_API_KEY**, **EXPO_PUBLIC_OPENROUTER_BASE_URL**: Dev Smart Input; not for production.
- **EXPO_PUBLIC_LOGO_DEV_TOKEN**: Optional merchant logo dev.

### 8.2 Environment variables (backend)

- **OPENROUTER_API_KEY**: PDF parsing.
- **GEMINI_API_KEY** or **GOOGLE_API_KEY**: Daily brief.
- **IMPORT_API_KEY**: Optional; app must send same as X-KLOVIO-IMPORT-KEY.
- **MAX_UPLOAD_MB**, **RATE_LIMIT_PER_MINUTE**, **CORS_ORIGINS**, **GEMINI_MODEL**, **GEMINI_BRIEF_MODEL**, **TIMEZONE**.

---

## 9. Hidden or Partial Features

### 9.1 Commented out in UI

- **Money tab — “Analyze & add from text”**: TextInput + button to parse pasted lines (e.g. “Starbucks $5.50”) and add transactions. Logic exists (`handleImportStatement`, `parseStatement(statementText)`); UI block is commented. FAQ/support copy still references it.
- **Settings — Preview notifications**: Section to send sample morning brief, due reminder, and smart nudge notifications. Functions exist in `lib/notifications.ts` (`previewMorningBriefNotification`, `previewDueReminderNotification`, `previewNudgeNotification`); Settings UI is commented.

### 9.2 Built but not used in main flows

- **SubscriptionWasteCard**: Component and `runSubscriptionWasteAnalysis` / `buildSubscriptionWastePayload` exist; Money tab import is commented (`// import { SubscriptionWasteCard }`). Card shows “Subscription Waste Detector” and runs AI analysis on subscriptions + life items (groups, summary lines, potential savings). Schema: **SubscriptionWasteResult** (groups, summaryLines, potentialSavingsCents).
- **PDF-extract service** (`services/pdf-extract`): Standalone Flask app POST /extract (base64 PDF → text). Not wired in main app; app uses backend parse-gemini directly.

### 9.3 Placeholder / future

- **Quick Add — Home Screen Widget**: Modal says “Coming soon. For now use Back Tap or Siri with the Quick Add shortcut.”
- **SHORTCUT_INSTALL_URL**: If URL contains "XXXX", Quick Add setup shows hint to replace with real iCloud Shortcut link.

### 9.4 Settings flags not surfaced in UI

- **quickAddEnabled**, **quickAddShortcutInstalledConfirmed**, **quickAddBackTapConfiguredConfirmed**: Stored in settings; setup flow does not consistently set these in the codebase (setup is instructional only).

---

## 10. Complete Product Definition

**Klovio** is a **life and money companion** for people who want one place to see what’s due, what they’re spending, and a calm daily summary—without juggling multiple apps or spreadsheets.

**What it does:**

- **Reminders & bills (Life items)**  
  You add things that have a due date and optional amount: rent, insurance, subscriptions, one-off tasks. You choose how often they repeat (once, daily, weekly, monthly, yearly) and how many days before you want a reminder. The app shows “Coming up” and “Your load” (Stable / Watch / Action Needed) so you know what needs attention.

- **Spending & income (Transactions)**  
  You log expenses and income by category (Food, Transport, Housing, etc.). You can type in plain language (“Coffee $5 tomorrow”) or add manually. You can also **import from a PDF or CSV** (e.g. bank or card statement); the app uses AI to extract transactions and add them in one go. You see month-to-date spend, breakdown by category, and simple insights (top category, vs last month, projected month end).

- **Subscriptions**  
  Recurring subscriptions are tracked (monthly/yearly) with next due date. They feed into “upcoming money” and recurring cost insights. Optional AI can help detect subscriptions from statements.

- **Daily morning brief**  
  If you turn it on, you get a **daily notification** at a time you choose. Tapping it opens a short, AI-generated summary: what’s overdue, what’s due this week, a 30-day outlook, and yesterday’s spend. If the AI isn’t available, you still get a clear, deterministic summary so the habit stays useful.

- **Smart Input**  
  In the Today, Money, and Items tabs you can type one line like “Rent due March 1” or “Netflix $15 monthly” or “Groceries $80 today”. The app figures out whether it’s a reminder, a transaction, or both, and creates the right items. When it’s unsure, it shows you a review screen so you can confirm or tweak before saving.

- **Quick Add**  
  On iPhone you can set up **Back Tap** (triple tap) to run a Shortcut that opens Klovio with a pre-filled line (e.g. from dictation). So you can add a reminder or log a purchase without opening the app first. The same deep link works from other apps or Siri.

- **Account & sync**  
  You can use Klovio entirely on one device with no account. If you **sign in** (email/password or Apple), your reminders, transactions, subscriptions, and settings sync to the cloud so you can use the same data on another phone or after reinstall. Data is stored in your account and not sold for ads.

- **Notifications**  
  Besides the morning brief, you get **due reminders** (e.g. “Rent due in 2 days”) and optional **smart nudges** (e.g. spending insight or “consider importing a statement”). Tapping a due reminder opens the app and asks “Have you completed [this]?” so you can mark it done and, for recurring items, move to the next date.

**Who it’s for:**  
Anyone who wants a single, calm place to stay on top of bills and due dates, see spending by category, and start the day with a short financial and task summary—without complexity or guilt-driven messaging.

**How to describe it in one sentence:**  
Klovio is a calm life & money app that combines reminders and bills, spending tracking, PDF/CSV import, a daily morning brief, and natural-language quick add so you can see what’s due and what you’re spending in one place.

---

*End of product specification.*
