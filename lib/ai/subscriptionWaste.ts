import { callAI } from '@/lib/ai/client';
import { subscriptionWasteSchema, type SubscriptionWasteResult } from '@/lib/ai/schemas';
import type { LifeItem, Subscription } from '@/lib/types';
import type { SubscriptionWastePayload } from '@/lib/ai/prompts';

/**
 * Build payload: subscriptions + recurring life items (monthly/yearly with amountCents).
 * Amounts normalized to cents; cadence monthly or yearly.
 */
export function buildSubscriptionWastePayload(
  subscriptions: Subscription[],
  lifeItems: LifeItem[]
): SubscriptionWastePayload {
  const items: SubscriptionWastePayload['items'] = [];

  for (const s of subscriptions) {
    items.push({
      title: s.title,
      amountCents: s.cadence === 'yearly' ? Math.round(s.amountCents / 12) : s.amountCents,
      cadence: 'monthly',
    });
  }

  for (const i of lifeItems) {
    if (i.status !== 'active') continue;
    if (i.amountCents == null || i.amountCents <= 0) continue;
    if (i.cadence !== 'monthly' && i.cadence !== 'yearly') continue;
    const monthlyCents = i.cadence === 'yearly' ? Math.round(i.amountCents / 12) : i.amountCents;
    items.push({
      title: i.title,
      amountCents: monthlyCents,
      cadence: 'monthly',
    });
  }

  return { items };
}

/** Normalize AI response: accept snake_case or camelCase */
function normalizeWasteResponse(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  const groups = (o.groups ?? o.Groups) as Array<Record<string, unknown>> | undefined;
  const summaryLines = (o.summaryLines ?? o.summary_lines ?? o.SummaryLines) as unknown;
  const potentialSavingsCents = (o.potentialSavingsCents ?? o.potential_savings_cents) as unknown;
  const num = (v: unknown): number =>
    typeof v === 'number' && !Number.isNaN(v) ? Math.max(0, Math.round(v)) : typeof v === 'string' ? num(parseFloat(v)) : 0;
  const normalizedGroups = Array.isArray(groups)
    ? groups.map((g) => ({
        groupName: (typeof (g.groupName ?? g.group_name) === 'string' ? (g.groupName ?? g.group_name) : 'Other') as string,
        totalMonthlyCents: num(g.totalMonthlyCents ?? g.total_monthly_cents),
        count: num(g.count ?? g.Count),
        itemTitles: Array.isArray(g.itemTitles ?? g.item_titles) ? (g.itemTitles ?? g.item_titles) as string[] : [],
        insight: typeof (g.insight ?? g.Insight) === 'string' ? (g.insight ?? g.Insight) as string : undefined,
      }))
    : [];
  const arr = Array.isArray(summaryLines)
    ? summaryLines.filter((s) => typeof s === 'string')
    : typeof summaryLines === 'string'
      ? [summaryLines]
      : [];
  return {
    groups: normalizedGroups,
    summaryLines: arr,
    potentialSavingsCents:
      typeof potentialSavingsCents === 'number' && potentialSavingsCents >= 0
        ? Math.round(potentialSavingsCents)
        : undefined,
  };
}

export type SubscriptionWasteAnalysisResult =
  | { ok: true; data: SubscriptionWasteResult }
  | { ok: false; error: string };

/**
 * Run Subscription Waste Detector: AI groups similar services and returns insights.
 */
export async function runSubscriptionWasteAnalysis(
  subscriptions: Subscription[],
  lifeItems: LifeItem[]
): Promise<SubscriptionWasteAnalysisResult> {
  const payload = buildSubscriptionWastePayload(subscriptions, lifeItems);
  if (payload.items.length === 0) {
    return { ok: false, error: 'No subscriptions or recurring bills to analyze.' };
  }

  try {
    const raw = await callAI<unknown>('subscription_waste', payload);
    const normalized = normalizeWasteResponse(raw);
    const result = subscriptionWasteSchema.safeParse(normalized);
    if (result.success) return { ok: true, data: result.data };
    return { ok: false, error: 'Invalid response from AI. Try again.' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network or API error.';
    return { ok: false, error: message };
  }
}
