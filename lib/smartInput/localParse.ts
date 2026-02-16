import * as chrono from 'chrono-node';
import { todayISO } from '@/lib/date';
import type { LocalParseResult, LocalReminder, LocalSpending } from './schemas';
import type { SmartInputParseResult } from '@/lib/ai/schemas';

const SMART_INPUT_CATEGORIES = [
  'Food',
  'Transport',
  'Subscriptions',
  'Insurance',
  'Health',
  'Utilities',
  'Housing',
  'Entertainment',
  'Other',
] as const;
type Category = (typeof SMART_INPUT_CATEGORIES)[number];

/** Keywords that suggest reminder / bill / renewal */
const REMINDER_BILL_KEYWORDS =
  /\b(renew|renewal|pay|due|bill|insurance|rent|membership|subscription|netflix|spotify|utility|utilities)\b/i;

/** Keywords that suggest one-off purchase / spending */
const PURCHASE_KEYWORDS =
  /\b(coffee|lunch|uber|groceries|gas|parking|meal|food|bought|spent|purchase)\b/i;

/** Cadence: monthly */
const CADENCE_MONTHLY = /\b(monthly|every month|per month|each month|month)\b/i;
/** Cadence: yearly */
const CADENCE_YEARLY = /\b(yearly|annually|every year|per year|each year|yearly)\b/i;

/** Currency amount patterns: $5, 5$, 5.00, CAD 5, 10 dollars */
const AMOUNT_PATTERNS = [
  /\$\s*(\d+(?:\.\d{1,2})?)/g,
  /(\d+(?:\.\d{1,2})?)\s*\$/g,
  /\bCAD\s*(\d+(?:\.\d{1,2})?)/gi,
  /\b(\d+(?:\.\d{1,2})?)\s*dollars?\b/gi,
  /\b(\d+)\s*cents?\b/gi,
  /** e.g. "5.00" or "10.50" (decimal avoids matching "7" in "May 7") */
  /\b(\d{1,4}\.\d{1,2})\b/g,
];

const DEFAULT_REMIND_DAYS_BEFORE = 7;

function parseAmounts(text: string): number[] {
  const cents: number[] = [];
  const seen = new Set<number>();

  for (const re of AMOUNT_PATTERNS) {
    const copy = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = copy.exec(text)) !== null) {
      const raw = m[1];
      const isCents = /\b\d+\s*cents?\b/i.test(m[0]);
      const num = parseFloat(raw);
      if (isNaN(num)) continue;
      const value = isCents ? Math.round(num) : Math.round(num * 100);
      if (value > 0 && !seen.has(value)) {
        seen.add(value);
        cents.push(value);
      }
    }
  }
  return [...new Set(cents)].slice(0, 3);
}

export type ParsedDateTime = { dateISO: string; timeHHMM?: string };

function parseDateTimes(text: string, nowISO: string): ParsedDateTime[] {
  const ref = new Date(nowISO + 'T12:00:00');
  const results = chrono.parse(text, ref, { forwardDate: true });
  const out: ParsedDateTime[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const d = r.start?.date();
    if (!d) continue;
    const iso = d.toISOString().slice(0, 10);
    const key = iso;
    if (seen.has(key)) continue;
    seen.add(key);
    let timeHHMM: string | undefined;
    const start = r.start as { isCertain?: (c: string) => boolean };
    if (start?.isCertain && start.isCertain('hour')) {
      const h = d.getHours();
      const m = d.getMinutes();
      timeHHMM = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    out.push({ dateISO: iso, timeHHMM });
  }
  return out;
}

function hasCadenceMonthly(text: string): boolean {
  return CADENCE_MONTHLY.test(text);
}
function hasCadenceYearly(text: string): boolean {
  return CADENCE_YEARLY.test(text);
}
function getCadence(text: string): 'one_time' | 'monthly' | 'yearly' | null {
  if (hasCadenceYearly(text)) return 'yearly';
  if (hasCadenceMonthly(text)) return 'monthly';
  return null;
}

function hasReminderBillKeywords(text: string): boolean {
  return REMINDER_BILL_KEYWORDS.test(text);
}
function hasPurchaseKeywords(text: string): boolean {
  return PURCHASE_KEYWORDS.test(text);
}

/** Suggest category from keywords */
function suggestCategory(text: string): Category {
  const t = text.toLowerCase();
  if (/\b(coffee|lunch|meal|food|groceries|restaurant|uber eats)\b/.test(t)) return 'Food';
  if (/\b(uber|gas|parking|transport|car|bus|train)\b/.test(t)) return 'Transport';
  if (/\b(netflix|spotify|subscription|membership)\b/.test(t)) return 'Subscriptions';
  if (/\b(insurance)\b/.test(t)) return 'Insurance';
  if (/\b(doctor|health|pharmacy)\b/.test(t)) return 'Health';
  if (/\b(utility|utilities|electric|water)\b/.test(t)) return 'Utilities';
  if (/\b(rent|housing)\b/.test(t)) return 'Housing';
  if (/\b(entertainment|movie|game)\b/.test(t)) return 'Entertainment';
  return 'Other';
}

/** Strip date/amount/time tokens from text to get a clean title (best effort) */
function normalizeTitle(
  text: string,
  dateStrs: string[],
  amountCents: number[]
): string {
  let out = text
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, '')
    .replace(/\d+(?:\.\d{1,2})?\s*\$/g, '')
    .replace(/\bCAD\s*\d+(?:\.\d{1,2})?/gi, '')
    .replace(/\b\d+(?:\.\d{1,2})?\s*dollars?\b/gi, '')
    .replace(/\b(monthly|yearly|every month|per month|annually|each year)\b/gi, '')
    .replace(/\b(today|tomorrow)\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi, '')
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\b/gi, '')
    .trim();
  for (const d of dateStrs) {
    out = out.replace(new RegExp(d.replace(/-/g, '-'), 'g'), '').trim();
  }
  for (const c of amountCents) {
    const asDollars = (c / 100).toString();
    out = out.replace(new RegExp(asDollars.replace('.', '\\.'), 'g'), '').trim();
  }
  out = out.replace(/\s+/g, ' ').trim();
  return out || text.trim();
}

/**
 * Local deterministic parse. No AI. Uses chrono-node for dates and regex for amounts/cadence/keywords.
 */
export function localParseSmartInput(text: string, nowISO: string): LocalParseResult {
  const reasons: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      intent: 'unknown',
      confidence: 0,
      reasons: ['empty input'],
    };
  }

  const dateTimes = parseDateTimes(trimmed, nowISO);
  const dates = dateTimes.map((x) => x.dateISO);
  const amounts = parseAmounts(trimmed);
  const amountCents = amounts.length > 0 ? amounts[0]! : 0;
  const cadence = getCadence(trimmed);
  const hasReminder = hasReminderBillKeywords(trimmed);
  const hasPurchase = hasPurchaseKeywords(trimmed);

  let confidence = 0.3;
  if (dateTimes.length > 0) {
    confidence += 0.3;
    reasons.push('date_found');
  }
  if (amounts.length > 0) {
    confidence += 0.3;
    reasons.push('amount_found');
  }
  if (cadence) {
    confidence += 0.2;
    reasons.push('cadence_found');
  }
  if (dateTimes.length > 1 || amounts.length > 1) {
    confidence -= 0.2;
    reasons.push('multiple_dates_or_amounts');
  }
  confidence = Math.max(0, Math.min(1, confidence));

  const title = normalizeTitle(trimmed, dates, amounts) || trimmed;
  const category = suggestCategory(trimmed);

  // --- Decision rules ---
  let intent: LocalParseResult['intent'] = 'unknown';

  if (amountCents > 0 && (cadence || hasReminder)) {
    intent = 'both';
    reasons.push('amount_and_cadence_or_bill');
  } else if (amountCents > 0 && !cadence && !hasReminder) {
    intent = 'spending';
    reasons.push('amount_only');
  } else if (dateTimes.length > 0 && amountCents === 0) {
    intent = 'reminder';
    reasons.push('date_only');
  } else if (amountCents > 0 && dateTimes.length === 0) {
    intent = 'spending';
    confidence = Math.min(confidence, 0.7);
    reasons.push('amount_no_date');
  } else if (dateTimes.length === 0 && amountCents === 0) {
    intent = 'unknown';
    reasons.push('no_date_no_amount');
  }

  const result: LocalParseResult = {
    intent,
    confidence,
    reasons,
  };

  if (intent === 'reminder' || intent === 'both') {
    const first = dateTimes[0];
    const nextDueISO = first ? first.dateISO : null;
    const dueTime = first?.timeHHMM ?? undefined;
    const rem: LocalReminder = {
      title,
      category,
      nextDueISO,
      dueTime: dueTime ?? null,
      cadence: cadence ?? 'one_time',
      remindDaysBefore: nextDueISO ? DEFAULT_REMIND_DAYS_BEFORE : undefined,
    };
    result.reminder = rem;
  }

  if (intent === 'spending' || intent === 'both') {
    const dateISO = dateTimes.length > 0 ? dateTimes[0]!.dateISO : nowISO;
    const spend: LocalSpending = {
      title,
      category,
      amountCents: amountCents > 0 ? amountCents : null,
      dateISO,
      cadence: cadence ?? 'one_time',
    };
    result.spending = spend;
  }

  return result;
}

/** Convert LocalParseResult to SmartInputParseResult for merge/execute */
export function localToSmartResult(local: LocalParseResult, nowISO: string): SmartInputParseResult {
  const reminder =
    local.reminder != null
      ? {
          title: local.reminder.title,
          category: local.reminder.category,
          nextDueISO: local.reminder.nextDueISO ?? null,
          dueTime: local.reminder.dueTime ?? null,
          cadence: (local.reminder.cadence ?? 'one_time') as 'one_time' | 'monthly' | 'yearly',
          remindDaysBefore: local.reminder.remindDaysBefore ?? DEFAULT_REMIND_DAYS_BEFORE,
        }
      : null;
  const spending =
    local.spending != null
      ? {
          title: local.spending.title,
          category: local.spending.category,
          amountCents: local.spending.amountCents ?? null,
          dateISO: local.spending.dateISO ?? nowISO,
          cadence: (local.spending.cadence ?? 'one_time') as 'one_time' | 'monthly' | 'yearly' | null,
        }
      : null;
  return {
    intent: local.intent,
    reminder,
    spending,
    confidence: local.confidence,
  };
}
