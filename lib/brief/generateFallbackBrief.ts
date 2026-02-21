/**
 * Deterministic fallback for the morning brief when AI fails or returns invalid/empty.
 * Max 4 lines, calm tone, no emojis, no fluff.
 */

import { formatCurrency } from '@/lib/currency';

export interface FallbackBriefInput {
  todayISO: string;
  dueNext7Days: { title: string; dateISO: string; amountCents?: number }[];
  forecast30DayTotalCents: number;
  yesterdaySpendCents: number;
  topSpendCategoryYesterday: string | null;
  overdueCount: number;
}

const MAX_LINES = 4;
const DEFAULT_LINES = [
  'No payments are due this week.',
  'Everything looks steady.',
];

/**
 * Generate a deterministic brief from the given data. Never throws.
 */
export function generateFallbackBrief(data: FallbackBriefInput): { lines: string[] } {
  const lines: string[] = [];

  if (data.overdueCount > 0) {
    lines.push(
      `You have ${data.overdueCount} overdue reminder${data.overdueCount === 1 ? '' : 's'}.`
    );
  }

  if (lines.length < MAX_LINES && data.dueNext7Days.length > 0) {
    const count = data.dueNext7Days.length;
    const first = data.dueNext7Days[0];
    const amountPart =
      first?.amountCents != null && first.amountCents > 0
        ? ` First is ${formatCurrency(first.amountCents)}.`
        : '';
    lines.push(
      `You have ${count} payment${count === 1 ? '' : 's'} due this week.${amountPart}`
    );
  }

  if (lines.length < MAX_LINES && data.forecast30DayTotalCents > 0) {
    lines.push(
      `Your 30-day forecast is ${formatCurrency(data.forecast30DayTotalCents)}.`
    );
  }

  if (lines.length < MAX_LINES && data.yesterdaySpendCents > 0) {
    let line = `You spent ${formatCurrency(data.yesterdaySpendCents)} yesterday.`;
    if (data.topSpendCategoryYesterday) {
      line += ` Mostly on ${data.topSpendCategoryYesterday}.`;
    }
    lines.push(line);
  }

  if (lines.length === 0) {
    return { lines: DEFAULT_LINES };
  }

  return { lines };
}
