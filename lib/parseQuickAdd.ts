import type { Cadence } from './types';
import { todayISO, yesterdayISO, tomorrowISO } from './date';

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4, jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const CADENCE_PATTERNS: { regex: RegExp; cadence: Cadence }[] = [
  { regex: /\b(monthly|each month|every month)\b/i, cadence: 'monthly' },
  { regex: /\b(yearly|annual|annually|each year|every year)\b/i, cadence: 'yearly' },
  { regex: /\b(one\s*time|once|one-time)\b/i, cadence: 'one_time' },
];

/**
 * Parse a quick-add line and auto-categorize as reminder (item) or one-off purchase (transaction).
 * e.g. "internet bill march 14, monthly" → item; "coffee $5" → transaction.
 */
export type QuickAddKind = 'item' | 'transaction';

export interface ParsedQuickAdd {
  title: string;
  nextDueISO: string;
  cadence: Cadence;
  amountCents?: number;
  category: string;
  /** When amount present and one-time → log as purchase; otherwise → reminder/item */
  kind: QuickAddKind;
}

function toTitleCase(s: string): string {
  return s.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function parseDateFromLine(line: string): { dateISO: string; matched: string } | null {
  const lower = line.toLowerCase().trim();

  // "today", "yesterday", "tomorrow" first so they're not confused with other tokens
  if (/\btoday\b/.test(lower)) {
    return { dateISO: todayISO(), matched: line.match(/\btoday\b/i)![0] };
  }
  if (/\byesterday\b/.test(lower)) {
    return { dateISO: yesterdayISO(), matched: line.match(/\byesterday\b/i)![0] };
  }
  if (/\btomorrow\b/.test(lower)) {
    return { dateISO: tomorrowISO(), matched: line.match(/\btomorrow\b/i)![0] };
  }

  // "march 14", "march 14th" — when year not specified, use current year
  const monthDay = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (monthDay) {
    const monthName = monthDay[1];
    const day = parseInt(monthDay[2], 10);
    const month = MONTHS[monthName];
    if (month != null && day >= 1 && day <= 31) {
      const year = new Date().getFullYear();
      const d = new Date(year, month, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return { dateISO: `${y}-${m}-${dayStr}`, matched: monthDay[0] };
    }
  }

  // "14 march", "14th of march" — when year not specified, use current year
  const dayMonth = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  if (dayMonth) {
    const day = parseInt(dayMonth[1], 10);
    const monthName = dayMonth[2];
    const month = MONTHS[monthName];
    if (month != null && day >= 1 && day <= 31) {
      const year = new Date().getFullYear();
      const d = new Date(year, month, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return { dateISO: `${y}-${m}-${dayStr}`, matched: dayMonth[0] };
    }
  }

  // "3/14", "14/3", "03/14" — when year not specified, use current year
  const slash = line.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const yearPart = slash[3];
    let month: number, day: number;
    if (a <= 12 && b <= 31 && (b > 12 || a <= 12)) {
      month = a - 1;
      day = b;
    } else if (b <= 12 && a <= 31) {
      month = b - 1;
      day = a;
    } else {
      return null;
    }
    const year = yearPart
      ? parseInt(yearPart, 10) < 100
        ? 2000 + parseInt(yearPart, 10)
        : parseInt(yearPart, 10)
      : new Date().getFullYear();
    const d = new Date(year, month, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return { dateISO: `${y}-${m}-${dayStr}`, matched: slash[0] };
  }

  // "the 14th", "14th", "on 14" → next occurrence of that day in current year (don't match "15" in "$15")
  const dayOnly = lower.match(/(?<!\$\s*)\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayOnly) {
    const day = parseInt(dayOnly[1], 10);
    if (day >= 1 && day <= 31) {
      const now = new Date();
      const year = now.getFullYear();
      let d = new Date(year, now.getMonth(), day);
      if (d.getTime() < now.getTime()) d = new Date(year, now.getMonth() + 1, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return { dateISO: `${y}-${m}-${dayStr}`, matched: dayOnly[0] };
    }
  }

  return null;
}

function parseCadenceFromLine(line: string): { cadence: Cadence; matched: string } | null {
  for (const { regex, cadence } of CADENCE_PATTERNS) {
    const m = line.match(regex);
    if (m) return { cadence, matched: m[1] };
  }
  return null;
}

function parseAmountFromLine(line: string): { amountCents: number; matched: string } | null {
  // Prefer explicit $ so "march 14" isn't confused: $50, $50.00
  const explicitDollar = line.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (explicitDollar) {
    const amount = Math.round(parseFloat(explicitDollar[1]) * 100);
    if (amount > 0) return { amountCents: amount, matched: explicitDollar[0].trim() };
  }
  // 50 dollars, 50$, 15 for coffee
  const other = line.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|cad)\s*|\b(\d+(?:\.\d{1,2})?)\s*\$/i);
  if (other) {
    const num = other[1] ?? other[2];
    if (num) {
      const amount = Math.round(parseFloat(num) * 100);
      if (amount > 0) return { amountCents: amount, matched: other[0].trim() };
    }
  }
  return null;
}

/**
 * Parse freeform text into reminder fields.
 * Example: "internet bill march 14, monthly" → { title: "Internet bill", nextDueISO: "2025-03-14", cadence: "monthly" }
 */
export function parseQuickAdd(raw: string): ParsedQuickAdd | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let rest = trimmed;
  let cadence: Cadence = 'one_time';
  let nextDueISO = todayISO();
  let amountCents: number | undefined;

  const cadenceResult = parseCadenceFromLine(rest);
  if (cadenceResult) {
    cadence = cadenceResult.cadence;
    rest = rest.replace(cadenceResult.matched, ' ').replace(/\s*,\s*/, ' ');
  }

  // Parse date BEFORE amount so "march 14" is taken as the due date, not "14" as $14
  const dateResult = parseDateFromLine(rest);
  if (dateResult) {
    nextDueISO = dateResult.dateISO;
    rest = rest.replace(dateResult.matched, ' ');
  }

  const amountResult = parseAmountFromLine(rest);
  if (amountResult) {
    amountCents = amountResult.amountCents;
    rest = rest.replace(amountResult.matched, ' ');
  }

  // Title: what's left, cleaned
  const title = toTitleCase(rest.replace(/\s+/g, ' ').replace(/\s*,\s*$/, '').trim());
  if (!title) return null;

  // Default category from first word or "General"
  const category = title.split(/\s+/)[0] || 'General';

  // Auto-categorize: one-off with amount → transaction (purchase); else → item (reminder)
  const kind: QuickAddKind =
    amountCents != null && cadence === 'one_time' ? 'transaction' : 'item';

  return {
    title,
    nextDueISO,
    cadence,
    amountCents,
    category,
    kind,
  };
}
