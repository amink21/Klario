import type { LifeItem, Subscription } from './types';
import { daysUntil } from './date';

/**
 * Sum of due amounts for items due within the next N days (active only).
 */
export function computeForecast(items: LifeItem[], days: number = 30): number {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  const endISO = end.toISOString().slice(0, 10);

  return items
    .filter((i) => i.status === 'active' && i.nextDueISO <= endISO && daysUntil(i.nextDueISO) >= 0)
    .reduce((sum, i) => sum + (i.amountCents ?? 0), 0);
}

/**
 * End date ISO (YYYY-MM-DD) for "next N days" from today.
 */
function endDateISO(days: number): string {
  const end = new Date();
  end.setDate(end.getDate() + days);
  return end.toISOString().slice(0, 10);
}

/**
 * Total due in next N days from life items + subscriptions (each sub counted once by nextDueISO).
 */
export function computeUpcomingTotal(
  items: LifeItem[],
  subscriptions: Subscription[],
  days: number = 30
): number {
  const endISO = endDateISO(days);
  const fromItems = items
    .filter((i) => i.status === 'active' && i.nextDueISO <= endISO && daysUntil(i.nextDueISO) >= 0)
    .reduce((sum, i) => sum + (i.amountCents ?? 0), 0);
  const fromSubs = subscriptions
    .filter((s) => s.nextDueISO <= endISO && daysUntil(s.nextDueISO) >= 0)
    .reduce((sum, s) => sum + s.amountCents, 0);
  return fromItems + fromSubs;
}

export type UpcomingBreakdownEntry = { category: string; amountCents: number };

/**
 * Breakdown of upcoming due amounts by category (next N days).
 * Life items use their category; subscriptions grouped as "Subscriptions".
 */
export function computeUpcomingBreakdown(
  items: LifeItem[],
  subscriptions: Subscription[],
  days: number = 30
): { totalCents: number; byCategory: UpcomingBreakdownEntry[] } {
  const endISO = endDateISO(days);
  const byCat: Record<string, number> = {};

  items
    .filter((i) => i.status === 'active' && i.nextDueISO <= endISO && daysUntil(i.nextDueISO) >= 0 && (i.amountCents ?? 0) > 0)
    .forEach((i) => {
      const cat = i.category || 'Other';
      byCat[cat] = (byCat[cat] ?? 0) + (i.amountCents ?? 0);
    });

  const subTotal = subscriptions
    .filter((s) => s.nextDueISO <= endISO && daysUntil(s.nextDueISO) >= 0)
    .reduce((sum, s) => sum + s.amountCents, 0);
  if (subTotal > 0) {
    byCat['Subscriptions'] = (byCat['Subscriptions'] ?? 0) + subTotal;
  }

  const totalCents = Object.values(byCat).reduce((a, b) => a + b, 0);
  const byCategory = Object.entries(byCat)
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  return { totalCents, byCategory };
}

/**
 * Life status from items due within 7 days and forecast size.
 * - Stable: 0–2 items due in 7 days, forecast not huge
 * - Watch: 3–5 items or higher forecast
 * - Action Needed: 6+ items due in 7 days or very high forecast
 */
export type LifeStatus = 'Stable' | 'Watch' | 'Action Needed';

export function computeLifeStatus(items: LifeItem[]): LifeStatus {
  const active = items.filter((i) => i.status === 'active');
  const dueIn7 = active.filter((i) => {
    const d = daysUntil(i.nextDueISO);
    return d >= 0 && d <= 7;
  });
  const forecast30 = computeForecast(active, 30);
  const count = dueIn7.length;
  const highForecast = forecast30 > 50000; // $500+ in 30 days

  if (count >= 6 || (count >= 4 && highForecast)) return 'Action Needed';
  if (count >= 3 || highForecast) return 'Watch';
  return 'Stable';
}
