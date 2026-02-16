import { todayISO } from '@/lib/date';
import type { SmartInputParseResult } from '@/lib/ai/schemas';
import { localParseSmartInput } from './localParse';
import { shouldCallAI, aiParseSmartInput } from './aiParse';
import { mergeParsed } from './merge';
import type { LocalParseResult } from './schemas';

const CACHE_SIZE = 20;
const CONFIDENCE_REVIEW_THRESHOLD = 0.7;

/** In-memory cache: text -> parsed result (to avoid repeat AI calls) */
const parseCache = new Map<string, { result: SmartInputParseResult; at: number }>();
const CACHE_TTL_MS = 60_000;

function getCached(text: string): SmartInputParseResult | null {
  const key = text.trim().toLowerCase();
  const entry = parseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    parseCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCached(text: string, result: SmartInputParseResult): void {
  const key = text.trim().toLowerCase();
  parseCache.set(key, { result, at: Date.now() });
  if (parseCache.size > CACHE_SIZE) {
    const first = parseCache.keys().next().value;
    if (first != null) parseCache.delete(first);
  }
}

function needReview(parsed: SmartInputParseResult): boolean {
  if (parsed.confidence < CONFIDENCE_REVIEW_THRESHOLD || parsed.intent === 'unknown') return true;
  if (
    (parsed.intent === 'reminder' || parsed.intent === 'both') &&
    parsed.reminder != null &&
    !parsed.reminder.nextDueISO
  )
    return true;
  if (
    (parsed.intent === 'spending' || parsed.intent === 'both') &&
    parsed.spending != null &&
    (parsed.spending.amountCents == null || parsed.spending.amountCents <= 0)
  )
    return true;
  return false;
}

export type HandleSmartInputOutcome =
  | { action: 'done'; parsed: SmartInputParseResult; toastMessage: string }
  | { action: 'review'; parsed: SmartInputParseResult }
  | { action: 'error'; error: string };

export type SmartInputContext = 'today' | 'items' | 'money';

/**
 * Hybrid Smart Input pipeline: local parse first, AI fallback when needed, merge, then execute or review.
 * Returns outcome so the caller can show toast, open ReviewSheet, or alert.
 */
export async function handleSmartInput(
  text: string,
  _context: SmartInputContext,
  nowISO: string = todayISO()
): Promise<HandleSmartInputOutcome> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { action: 'error', error: 'Please enter something.' };
  }

  const cached = getCached(trimmed);
  if (cached != null && !needReview(cached)) {
    return { action: 'done', parsed: cached, toastMessage: '' };
  }

  const local: LocalParseResult = localParseSmartInput(trimmed, nowISO);

  let aiResult: SmartInputParseResult | null = null;
  if (shouldCallAI(local, nowISO)) {
    try {
      aiResult = await aiParseSmartInput(trimmed, nowISO);
    } catch {
      aiResult = null;
    }
  }

  const merged = mergeParsed(local, aiResult, nowISO);
  setCached(trimmed, merged);

  if (needReview(merged)) {
    if (merged.reminder == null && merged.spending == null) {
      merged.reminder = {
        title: trimmed,
        category: 'Other',
        nextDueISO: nowISO,
        cadence: 'one_time',
        remindDaysBefore: 7,
      };
    }
    return { action: 'review', parsed: merged };
  }

  const hasReminder =
    (merged.intent === 'reminder' || merged.intent === 'both') &&
    merged.reminder != null &&
    merged.reminder.nextDueISO != null;
  const hasSpending =
    (merged.intent === 'spending' || merged.intent === 'both') &&
    merged.spending != null &&
    (merged.spending.amountCents ?? 0) > 0;

  if (!hasReminder && !hasSpending) {
    return { action: 'review', parsed: merged };
  }

  const toastMessage =
    hasReminder && hasSpending
      ? 'Added both'
      : hasReminder
        ? 'Added reminder'
        : 'Added spend';
  return { action: 'done', parsed: merged, toastMessage };
}
