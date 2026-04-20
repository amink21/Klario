import { dailyBriefSchema, type DailyBriefResult } from './schemas';
import { todayISO } from '../date';
import { generateDailyBriefWithGemini } from './dailyBriefGemini';
import {
  generateFallbackBrief,
  type FallbackBriefInput,
} from '../brief/generateFallbackBrief';

export interface DailyBriefInput {
  upcomingItems: { title: string; nextDueISO: string }[];
  dueSoonCount: number;
  forecastAmount: number;
  yesterdaySpend: number;
  topSpendCategory: string;
  /** For fallback brief when AI fails. */
  overdueCount?: number;
  /** For fallback brief when AI fails (title, dateISO, optional amountCents). */
  dueNext7Days?: { title: string; dateISO: string; amountCents?: number }[];
}

const CACHE_KEY_PREFIX = 'klovio_ai_brief_';

/** In-memory cache: key = date ISO (YYYY-MM-DD), value = { lines, inputHash } */
const cache = new Map<
  string,
  { lines: string[]; inputHash: string }
>();

function hashInput(input: DailyBriefInput): string {
  return JSON.stringify({
    dueSoonCount: input.dueSoonCount,
    forecastAmount: input.forecastAmount,
    yesterdaySpend: input.yesterdaySpend,
    topSpendCategory: input.topSpendCategory,
    itemCount: input.upcomingItems.length,
    firstTwo: input.upcomingItems.slice(0, 2).map((i) => i.title + i.nextDueISO),
  });
}

function buildFallbackInput(input: DailyBriefInput): FallbackBriefInput {
  const dueNext7Days =
    input.dueNext7Days ??
    input.upcomingItems.map((i) => ({ title: i.title, dateISO: i.nextDueISO }));
  return {
    todayISO: todayISO(),
    dueNext7Days,
    forecast30DayTotalCents: input.forecastAmount,
    yesterdaySpendCents: input.yesterdaySpend,
    topSpendCategoryYesterday: input.topSpendCategory || null,
    overdueCount: input.overdueCount ?? 0,
  };
}

/** Use fallback brief; never throws. */
function getFallbackLines(input: DailyBriefInput): string[] {
  try {
    return generateFallbackBrief(buildFallbackInput(input)).lines;
  } catch {
    return ['No payments are due this week.', 'Everything looks steady.'];
  }
}

function isValidBriefResult(parsed: DailyBriefResult): boolean {
  if (!Array.isArray(parsed.lines) || parsed.lines.length === 0) return false;
  const hasNonEmpty = parsed.lines.some((line) => typeof line === 'string' && line.trim().length > 0);
  return hasNonEmpty;
}

/**
 * Generate AI daily brief. Cached per calendar day; regenerates if data changes.
 * On AI error, timeout, invalid response, or empty lines, uses deterministic fallback.
 * Tone: calm, non-judgmental, brief, no emojis, no financial shaming.
 */
export async function generateDailyBrief(input: DailyBriefInput): Promise<DailyBriefResult> {
  const dateKey = todayISO();
  const inputHash = hashInput(input);
  const cached = cache.get(dateKey);
  if (cached && cached.inputHash === inputHash) {
    return { lines: cached.lines };
  }

  let parsed: DailyBriefResult;
  try {
    parsed = await generateDailyBriefWithGemini(input);
    if (!isValidBriefResult(parsed)) {
      parsed = { lines: getFallbackLines(input) };
    }
  } catch {
    parsed = { lines: getFallbackLines(input) };
  }

  cache.set(dateKey, { lines: parsed.lines, inputHash });
  return parsed;
}

/** Regenerate brief (e.g. for testing); bypasses cache for this call. Uses fallback on AI failure. */
export async function regenerateDailyBrief(input: DailyBriefInput): Promise<DailyBriefResult> {
  let parsed: DailyBriefResult;
  try {
    parsed = await generateDailyBriefWithGemini(input);
    if (!isValidBriefResult(parsed)) {
      parsed = { lines: getFallbackLines(input) };
    }
  } catch {
    parsed = { lines: getFallbackLines(input) };
  }
  const dateKey = todayISO();
  cache.set(dateKey, { lines: parsed.lines, inputHash: hashInput(input) });
  return parsed;
}
