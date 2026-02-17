import { TRANSACTION_CATEGORIES, SMART_INPUT_CATEGORIES } from './schemas';

const JSON_ONLY = 'Respond with valid JSON only. No markdown, no explanation.';

/** Build system + user prompt for life item extraction (Smart Add) */
export function extractLifeItemPrompt(input: string): { system: string; user: string } {
  const system = `You extract structured reminder/bill data from a single natural-language sentence.
Output strict JSON with: title (string), category (string), amountCents (integer, optional), cadence (one of: one_time, daily, monthly, yearly), nextDueISO (YYYY-MM-DD), remindDaysBefore (0-365), confidence (0-1).
Use today's date context for relative dates. ${JSON_ONLY}`;
  const user = input.trim();
  return { system, user };
}

/** Build prompt for transaction categorization */
export function transactionCategoryPrompt(payload: {
  title: string;
  merchant?: string;
  amountCents: number;
}): { system: string; user: string } {
  const categories = TRANSACTION_CATEGORIES.join(', ');
  const system = `Categorize this transaction. Output JSON: { "category": one of [${categories}], "confidence": 0-1 }. ${JSON_ONLY}`;
  const user = JSON.stringify({
    title: payload.title,
    merchant: payload.merchant,
    amountCents: payload.amountCents,
  });
  return { system, user };
}

/** Build prompt for daily brief */
export function dailyBriefPrompt(payload: {
  upcomingItems: { title: string; nextDueISO: string }[];
  dueSoonCount: number;
  forecastAmount: number;
  yesterdaySpend: number;
  topSpendCategory: string;
}): { system: string; user: string } {
  const system = `Generate a calm, brief daily summary. Tone: calm, non-judgmental, no emojis, no financial shaming.
Output JSON: { "lines": [ "line1", "line2", ... ] }. Max 4 short bullet lines. ${JSON_ONLY}`;
  const user = JSON.stringify(payload);
  return { system, user };
}

/** Build prompt for subscription detection */
export function subscriptionDetectionPrompt(payload: {
  merchant: string;
  transactionDates: string[];
  amounts: number[];
}): { system: string; user: string } {
  const system = `Determine if this merchant looks like a subscription. Output JSON: { "isSubscription": boolean, "cadence": "monthly" or "yearly" if applicable, "estimatedNextDueISO": "YYYY-MM-DD" if applicable, "confidence": 0-1 }. ${JSON_ONLY}`;
  const user = JSON.stringify(payload);
  return { system, user };
}

/** Build prompt for Smart Input (universal bar): intent + reminder + spending */
export function smartInputParsePrompt(input: string, nowISO?: string): { system: string; user: string } {
  const categories = SMART_INPUT_CATEGORIES.join(', ');
  const todayContext = nowISO ? `Today's date is ${nowISO}. ` : '';
  const system = `Parse this into structured actions. ${todayContext}Output strict JSON only:
{
  "intent": "reminder" | "spending" | "both" | "unknown",
  "reminder": { "title": string, "category": one of [${categories}], "nextDueISO": "YYYY-MM-DD" or null, "dueTime": "HH:mm" 24h or null, "cadence": "one_time"|"daily"|"monthly"|"yearly" or null, "remindDaysBefore": 0-365 or null } or null,
  "spending": { "title": string, "category": one of [${categories}], "amountCents": number or null, "dateISO": "YYYY-MM-DD" or null, "cadence": "one_time"|"daily"|"monthly"|"yearly" or null } or null,
  "confidence": 0-1
}
Examples: "car insurance May 7 $200 monthly" -> both. "Feb 28 wash car" -> reminder only. "Meeting tomorrow 7pm" -> reminder with dueTime "19:00". "Call mom at 1am" -> reminder with dueTime "01:00". Use relative dates (today, tomorrow -> YYYY-MM-DD). For times use 24h "HH:mm" (e.g. 7pm -> "19:00", 1am -> "01:00"). Amounts in cents. ${JSON_ONLY}`;
  const user = input.trim();
  return { system, user };
}

/** Payload for subscription waste analysis */
export type SubscriptionWastePayload = {
  items: Array<{ title: string; amountCents: number; cadence: 'monthly' | 'yearly' }>;
};

/** Build prompt for Subscription Waste Detector: group similar subs, highlight waste */
export function subscriptionWastePrompt(payload: SubscriptionWastePayload): { system: string; user: string } {
  const system = `You analyze recurring subscriptions and bills to find waste. Input: list of { title, amountCents, cadence } (amounts in cents; cadence monthly or yearly).

Output strict JSON only:
{
  "groups": [
    {
      "groupName": "Streaming" | "Software" | "Fitness" | "Insurance" | "Utilities" | "Other" (short category name),
      "totalMonthlyCents": number (sum in monthly cents; yearly/12),
      "count": number of items in group,
      "itemTitles": ["Netflix", "Spotify", ...],
      "insight": optional one-line tip e.g. "3 streaming services; consider keeping 1–2."
    }
  ],
  "summaryLines": [
    "You pay $X/month across N streaming services.",
    "High cost per category: ...",
    "Consider cancelling or consolidating: ..."
  ],
  "potentialSavingsCents": optional number (estimate in monthly cents)

Rules: Group by similarity (streaming, software, fitness, etc.). Convert yearly to monthly (divide by 12). Write 1–3 short, non-judgmental summary lines. Highlight multiple similar services and high totals. ${JSON_ONLY}`;
  const user = JSON.stringify(payload);
  return { system, user };
}
