/**
 * Heavy deterministic smart input parser.
 * NO AI. Uses chrono-node for dates, regex for money/cadence, rule-based intent.
 */

import * as chrono from 'chrono-node';
import { todayISO } from '@/lib/date';
import { extractAmounts } from './money';
import { detectCadence, type Cadence } from './cadence';

export type { Cadence } from './cadence';
import { getMatchedKeywords, REMINDER_KEYWORDS, SPENDING_KEYWORDS, BILLING_RECURRING_KEYWORDS } from './keywords';
import { decideIntent, buildIntentInput } from './intent';
import { classifyCategoryWithOverrides, type Category } from './category';
import { normalizeTitle } from './title';
import { computeConfidence } from './confidence';

export type { Category } from './category';
export type Intent = 'reminder' | 'spending' | 'both' | 'unknown';

export type ParsedResult = {
  raw: string;
  intent: Intent;
  confidence: number;
  reasons: string[];

  reminder?: {
    title: string;
    category: Category;
    nextDueISO: string | null;
    cadence: Cadence;
    remindDaysBefore: number;
  };

  spending?: {
    title: string;
    category: Category;
    amountCents: number | null;
    dateISO: string | null;
  };

  tokens: {
    dates: string[];
    amountsCents: number[];
    cadence: Cadence | null;
    currency: 'CAD' | 'USD' | null;
    keywords: string[];
  };
};

/** Get tomorrow (YYYY-MM-DD). */
function tomorrowISO(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Same weekday next week (YYYY-MM-DD). */
function nextWeekISO(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** Get first of next month (YYYY-MM-DD). */
function firstOfNextMonth(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

/** Get first of next year (YYYY-MM-DD). */
function firstOfNextYear(now: Date): string {
  const d = new Date(now.getFullYear() + 1, 0, 1);
  return d.toISOString().slice(0, 10);
}

/** Parse dates from text using chrono-node. Returns ISO strings. */
function extractDates(text: string, now: Date): string[] {
  const ref = new Date(now);
  const results = chrono.parse(text, ref, { forwardDate: true });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of results) {
    const d = r.start?.date();
    if (!d) continue;
    const iso = d.toISOString().slice(0, 10);
    if (seen.has(iso)) continue;
    seen.add(iso);
    out.push(iso);
  }
  return out;
}

/** Check if text has "tomorrow" / "today" / near-future date (for remindDaysBefore=3). */
function isNearFuture(dateISO: string | null, text: string, now: Date): boolean {
  if (!dateISO) return false;
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  if (dateISO === today || dateISO === tomorrowStr) return true;
  if (/\b(today|tomorrow)\b/i.test(text)) return true;
  return false;
}

/**
 * Deterministic parse of smart input.
 * Defaults:
 * - spending.dateISO = detected date or today
 * - reminder.nextDueISO = detected date or null (for both: if recurring without date, use first of next month/year)
 * - reminder.remindDaysBefore = 7 (or 3 if today/tomorrow)
 * - reminder.cadence = detected or one_time
 *
 * For BOTH: reminder.nextDueISO must be present; if not and recurring -> use first of next month/year.
 * For BOTH: spending.amountCents must be present; if not -> intent unknown.
 */
export function parseSmartInput(
  text: string,
  now: Date = new Date(),
  merchantCategoryMap?: Record<string, Category>
): ParsedResult {
  const raw = text.trim().replace(/\s+/g, ' ');
  const nowISO = now.toISOString().slice(0, 10);

  const dates = extractDates(raw, now);
  const { amountsCents, currency } = extractAmounts(raw);
  const cadence = detectCadence(raw);
  const keywords = [
    ...getMatchedKeywords(raw, REMINDER_KEYWORDS),
    ...getMatchedKeywords(raw, SPENDING_KEYWORDS),
    ...getMatchedKeywords(raw, BILLING_RECURRING_KEYWORDS),
  ];

  const amountPresent = amountsCents.length > 0 && amountsCents.some((c) => c > 0);
  const datePresent = dates.length > 0;
  const cadencePresent = cadence !== null;
  const multipleDates = dates.length > 1;
  const multipleAmounts = amountsCents.length > 1;

  const intentInput = buildIntentInput(raw, {
    amountPresent,
    datePresent,
    cadencePresent,
    multipleDates,
    multipleAmounts,
  });
  let intent = decideIntent(intentInput);

  const primaryAmount = amountsCents.length > 0
    ? (amountsCents.length > 1 ? amountsCents[amountsCents.length - 1]! : amountsCents[0]!)
    : null;
  const primaryDate = dates[0] ?? null;

  const category = classifyCategoryWithOverrides(raw, merchantCategoryMap);
  const title = normalizeTitle(raw, {
    datePhrases: dates,
    amountsCents,
    cadenceWords: cadence ? [cadence] : [],
  }) || raw.trim();

  const reasons: string[] = [...intentInput.reminderHits ? ['reminder_hits'] : []];
  if (intentInput.spendingHits) reasons.push('spending_hits');
  if (intentInput.recurringHits) reasons.push('recurring_hits');

  const strongKeyword =
    (intent === 'reminder' && intentInput.reminderHits >= 1) ||
    (intent === 'spending' && intentInput.spendingHits >= 1) ||
    (intent === 'both' && (intentInput.reminderHits >= 1 || intentInput.recurringHits >= 1));

  const weakHeuristic =
    amountPresent && intentInput.reminderHits === 0 && intentInput.spendingHits === 0 && !cadencePresent;

  const { confidence, reasons: confReasons } = computeConfidence({
    datePresent,
    amountPresent,
    cadencePresent,
    strongKeywordMatch: strongKeyword,
    multipleDates,
    multipleAmounts,
    weakHeuristic,
  });
  reasons.push(...confReasons);

  let nextDueISO: string | null = primaryDate;

  // BOTH or reminder without date but recurring -> use deterministic default
  if ((intent === 'both' || intent === 'reminder') && !nextDueISO && cadence) {
    if (cadence === 'daily') {
      nextDueISO = tomorrowISO(now);
      reasons.push('recurring_no_date_use_tomorrow');
    } else if (cadence === 'weekly') {
      nextDueISO = nextWeekISO(now);
      reasons.push('recurring_no_date_use_next_week');
    } else if (cadence === 'monthly') {
      nextDueISO = firstOfNextMonth(now);
      reasons.push('recurring_no_date_use_first_of_month');
    } else if (cadence === 'yearly') {
      nextDueISO = firstOfNextYear(now);
      reasons.push('recurring_no_date_use_first_of_year');
    }
  }

  // BOTH requires amount and date (or recurring default)
  if (intent === 'both') {
    if (!primaryAmount || primaryAmount <= 0) {
      intent = 'unknown';
      reasons.push('both_requires_amount');
    }
    if (!nextDueISO) {
      intent = 'unknown';
      reasons.push('both_requires_date');
    }
  }

  const remindDaysBefore = nextDueISO && isNearFuture(nextDueISO, raw, now) ? 3 : 7;

  const result: ParsedResult = {
    raw,
    intent,
    confidence,
    reasons: [...new Set(reasons)],
    tokens: {
      dates,
      amountsCents,
      cadence,
      currency,
      keywords,
    },
  };

  if (intent === 'reminder' || intent === 'both') {
    result.reminder = {
      title,
      category,
      nextDueISO,
      cadence: cadence ?? 'one_time',
      remindDaysBefore,
    };
  }

  if (intent === 'spending' || intent === 'both') {
    result.spending = {
      title,
      category,
      amountCents: primaryAmount,
      dateISO: primaryDate ?? nowISO,
    };
  }

  return result;
}
