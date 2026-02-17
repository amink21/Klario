/**
 * Keyword dictionaries for intent detection.
 * NO AI. Deterministic keyword matching.
 */

/** Words that suggest a reminder / bill / renewal / task */
export const REMINDER_KEYWORDS = [
  'pay', 'due', 'renew', 'renewal', 'bill', 'insurance', 'rent', 'mortgage',
  'appointment', 'dentist', 'passport', 'license', 'registration', 'tax',
  'file', 'submit', 'wash', 'call', 'meeting', 'renews', 'remind', 'schedule',
];

/** Words that suggest a one-off purchase / spending */
export const SPENDING_KEYWORDS = [
  'coffee', 'lunch', 'dinner', 'groceries', 'gas', 'uber', 'lyft', 'parking',
  'amazon', 'order', 'bought', 'spent', 'purchase', 'meal', 'restaurant',
];

/** Words that suggest billing / recurring / subscription */
export const BILLING_RECURRING_KEYWORDS = [
  'subscription', 'membership', 'plan', 'monthly', 'yearly', 'invoice',
  'statement', 'premium', 'netflix', 'spotify', 'gym',
];

/**
 * Count how many keywords from a list appear in text (case-insensitive).
 */
export function countKeywordHits(text: string, keywords: string[]): number {
  const t = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    if (t.includes(kw.toLowerCase())) count++;
  }
  return count;
}

/**
 * Get all matched keywords from text.
 */
export function getMatchedKeywords(text: string, keywords: string[]): string[] {
  const t = text.toLowerCase();
  const matched: string[] = [];
  for (const kw of keywords) {
    if (t.includes(kw.toLowerCase())) matched.push(kw);
  }
  return matched;
}
