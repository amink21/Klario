/**
 * Deterministic fallback for the morning brief when AI fails or returns invalid/empty.
 * Friendly, first-person (bear talking to user); no emojis.
 */

import { formatCurrency } from '@/lib/currency';
import { formatDisplayDate } from '@/lib/date';

export interface FallbackBriefInput {
  todayISO: string;
  dueNext7Days: { title: string; dateISO: string; amountCents?: number }[];
  forecast30DayTotalCents: number;
  yesterdaySpendCents: number;
  topSpendCategoryYesterday: string | null;
  overdueCount: number;
}

const MAX_LINES = 8;
const DEFAULT_LINES = [
  "Good morning. I had a look at your list—nothing's due this week.",
  "You're all set for now. Have a good one.",
];

/**
 * Generate a deterministic brief from the given data. Never throws.
 * Tone: friendly bear talking to the user ("you"/"your").
 */
export function generateFallbackBrief(data: FallbackBriefInput): { lines: string[] } {
  const lines: string[] = [];

  lines.push("Good morning. Here's what I've got for you.");

  if (data.overdueCount > 0) {
    lines.push(
      `You've got ${data.overdueCount} thing${data.overdueCount === 1 ? '' : 's'} that slipped past the due date—no stress, just worth a look when you can.`
    );
  }

  if (lines.length <= MAX_LINES && data.dueNext7Days.length > 0) {
    const count = data.dueNext7Days.length;
    const first = data.dueNext7Days[0];
    if (first) {
      const dateStr = formatDisplayDate(first.dateISO);
      const amountPart =
        first.amountCents != null && first.amountCents > 0
          ? ` (${formatCurrency(first.amountCents)})`
          : '';
      lines.push(
        `This week you have ${count} item${count === 1 ? '' : 's'} due. Up first: ${first.title} on ${dateStr}${amountPart}.`
      );
    } else {
      lines.push(`You have ${count} item${count === 1 ? '' : 's'} due in the next 7 days.`);
    }
  }

  if (lines.length <= MAX_LINES && data.forecast30DayTotalCents > 0) {
    lines.push(
      `Over the next 30 days, you're looking at about ${formatCurrency(data.forecast30DayTotalCents)} in planned stuff—good to keep in mind.`
    );
  }

  if (lines.length <= MAX_LINES && data.yesterdaySpendCents > 0) {
    let line = `Yesterday you spent ${formatCurrency(data.yesterdaySpendCents)}`;
    if (data.topSpendCategoryYesterday) {
      line += `, mostly on ${data.topSpendCategoryYesterday}`;
    }
    line += '.';
    lines.push(line);
  }

  if (lines.length <= MAX_LINES) {
    lines.push("That's it from me—have a good one.");
  }

  if (lines.length === 1) {
    return { lines: DEFAULT_LINES };
  }

  return { lines };
}
