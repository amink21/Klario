import { callAI } from './client';
import { dailyBriefSchema, type DailyBriefResult } from './schemas';
import { todayISO } from '../date';

export interface DailyBriefInput {
  upcomingItems: { title: string; nextDueISO: string }[];
  dueSoonCount: number;
  forecastAmount: number;
  yesterdaySpend: number;
  topSpendCategory: string;
}

const CACHE_KEY_PREFIX = 'klario_ai_brief_';

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

/**
 * Generate AI daily brief. Cached per calendar day; regenerates if data changes.
 * Tone: calm, non-judgmental, brief, no emojis, no financial shaming.
 */
export async function generateDailyBrief(input: DailyBriefInput): Promise<DailyBriefResult> {
  const dateKey = todayISO();
  const inputHash = hashInput(input);
  const cached = cache.get(dateKey);
  if (cached && cached.inputHash === inputHash) {
    return { lines: cached.lines };
  }

  const raw = await callAI<unknown>('daily_brief', input);
  const parsed = dailyBriefSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`AI daily brief invalid: ${parsed.error.message}`);
  }
  cache.set(dateKey, { lines: parsed.data.lines, inputHash });
  return parsed.data;
}

/** Regenerate brief (e.g. for testing); bypasses cache for this call. */
export async function regenerateDailyBrief(input: DailyBriefInput): Promise<DailyBriefResult> {
  const raw = await callAI<unknown>('daily_brief', input);
  const parsed = dailyBriefSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`AI daily brief invalid: ${parsed.error.message}`);
  }
  const dateKey = todayISO();
  cache.set(dateKey, { lines: parsed.data.lines, inputHash: hashInput(input) });
  return parsed.data;
}
