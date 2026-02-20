# Klario AI Layer – Usage

- **Morning brief:** [Google Gemini](https://ai.google.dev/gemini-api/docs). Set `EXPO_PUBLIC_GOOGLE_API_KEY` or `GEMINI_API_KEY` in `.env` (get a key at [Google AI Studio](https://aistudio.google.com/apikey)). Never hardcode.
- **Other AI (Smart Add, categories, subscriptions, etc.):** [OpenRouter](https://openrouter.ai/docs/quickstart). Set `EXPO_PUBLIC_OPENROUTER_API_KEY` in `.env` (get a key at [openrouter.ai/keys](https://openrouter.ai/keys)).
- **Backend proxy (OpenRouter only):** Set `EXPO_PUBLIC_OPENROUTER_BASE_URL` to your proxy URL to override the OpenRouter endpoint.
- All AI responses are validated with Zod before use.

---

## How to test the AI

### 1. Set your API key

In the project root, create or edit `.env` (do not commit real keys). Get a key at [openrouter.ai/keys](https://openrouter.ai/keys):

```bash
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
```

Restart the dev server so the env is picked up (`npm start` then press `r` to reload, or stop and run `npm start` again).  
If the key still doesn’t load, add it to `app.json` under `expo.extra` (e.g. `"openrouterApiKey": "sk-or-..."`) and we can read it from `Constants.expoConfig?.extra` in the client.

### 2. Test from the app (Settings)

In **Settings**, scroll to the **Developer** section. You have three options:

| Button | What it does |
|--------|----------------|
| **Test AI (Smart Add)** | Parses “Car insurance March 12 yearly $1400” and shows title, category, due date, amount, confidence. |
| **Test morning brief** | Generates 1–4 calm summary lines (the daily brief) and shows them in a popup. |
| **Test all AI features** | Runs all four: Smart Add, transaction category, morning brief, subscription detection. Shows a short summary (e.g. “1) Smart Add: Car insurance (85%)”, “2) Category: Subscriptions (90%)”, “3) Brief: 2 lines”, “4) Subscription: yes (92%), create=true”). |

If you see `no_api_key`, the key was not loaded — check `EXPO_PUBLIC_OPENROUTER_API_KEY` in `.env` and restart.

### 3. Test all four features (optional)

From any screen you can call:

```ts
import { runAllAITests } from '@/lib/ai/testHelpers';
import { Alert } from 'react-native';

const result = await runAllAITests();
Alert.alert(result.ok ? 'AI tests' : 'Error', result.ok ? result.message : result.error);
```

### 4. Test a single feature in code

```ts
import { runAITest } from '@/lib/ai/testHelpers';
const result = await runAITest();  // Smart Add only
// result.ok && result.message, or !result.ok && result.error
```

---

## 1) AI Smart Add (Life Item Parsing)

Parse a natural sentence into structured life item fields. If `lowConfidence` is true, warn the user to review.

```ts
import { parseLifeItemWithAI } from '@/lib/ai';

const input = 'Car insurance renews March 12 yearly $1400';
const { data, lowConfidence } = await parseLifeItemWithAI(input);
// data: { title, category, amountCents?, cadence, nextDueISO, remindDaysBefore, confidence }
if (lowConfidence) {
  // Show: "Please review the details below."
}
// Populate AddItem form with data
```

---

## 2) AI Transaction Categorization

When adding a transaction, get a category from the predefined list. Confidence &lt; 0.5 returns `"Other"`.

```ts
import { categorizeTransactionWithAI } from '@/lib/ai';

const result = await categorizeTransactionWithAI({
  title: 'Spotify - $14.99',
  merchant: 'Spotify',
  amountCents: 1499,
});
// result: { category: 'Subscriptions', confidence: 0.95 }
// If confidence < 0.5, category is forced to "Other"
```

---

## 3) AI Daily Brief

Generate a short, calm summary for the Today screen. Cached per calendar day; regenerates when data changes.

```ts
import { generateDailyBrief, regenerateDailyBrief } from '@/lib/ai';

const brief = await generateDailyBrief({
  upcomingItems: items.slice(0, 5).map((i) => ({ title: i.title, nextDueISO: i.nextDueISO })),
  dueSoonCount: 3,
  forecastAmount: 45000,
  yesterdaySpend: 8200,
  topSpendCategory: 'Food',
});
// brief.lines: string[] (max 4)

// Force regenerate (e.g. testing):
const fresh = await regenerateDailyBrief(sameInput);
```

---

## 4) AI Subscription Detection

After pre-filtering repeating merchants from the last 60 days, send to AI. Only create a subscription if `shouldCreateSubscription(result)` is true.

```ts
import { detectSubscriptionWithAI, shouldCreateSubscription } from '@/lib/ai';

const result = await detectSubscriptionWithAI({
  merchant: 'Spotify',
  transactionDates: ['2025-01-08', '2025-02-08', '2025-03-08'],
  amounts: [1499, 1499, 1499],
});
// result: { isSubscription, cadence?, estimatedNextDueISO?, confidence }

if (shouldCreateSubscription(result)) {
  // Create subscription with detected=true, aiMeta: { confidence: result.confidence }
}
```

---

## Error handling

```ts
import { callAI } from '@/lib/ai';
import type { AIError } from '@/lib/ai';

try {
  const out = await parseLifeItemWithAI('...');
} catch (e) {
  const err = e as AIError;
  if (err.code === 'no_api_key') { /* show setup message */ }
  if (err.code === 'rate_limit') { /* retry later */ }
  if (err.code === 'timeout') { /* retry or show error */ }
  if (err.code === 'invalid_json') { /* fallback or retry */ }
}
```
