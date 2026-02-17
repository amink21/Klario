/**
 * Cadence / recurrence detection from free-form text.
 * NO AI. Pure regex.
 */

export type Cadence = 'one_time' | 'daily' | 'monthly' | 'yearly';

const DAILY_PATTERNS = [
  /\bdaily\b/i,
  /\bevery\s+day\b/i,
  /\beach\s+day\b/i,
  /\bper\s+day\b/i,
  /\bday\s*\/\s*day\b/i,
];

const MONTHLY_PATTERNS = [
  /\bmonthly\b/i,
  /\bevery\s+month\b/i,
  /\bper\s+month\b/i,
  /\beach\s+month\b/i,
  /\b\/?\s*mo\.?\s*$/i,
  /\b\/\s*month\b/i,
];

const YEARLY_PATTERNS = [
  /\byearly\b/i,
  /\bannually\b/i,
  /\bevery\s+year\b/i,
  /\bper\s+year\b/i,
  /\beach\s+year\b/i,
  /\b\/?\s*yr\.?\s*$/i,
  /\b\/\s*year\b/i,
];

const ONE_TIME_PATTERNS = [
  /\bonce\b/i,
  /\bone[- ]?time\b/i,
  /\bsingle\b/i,
  /\bjust\s+this\s+time\b/i,
  /\bone\s+off\b/i,
];

/**
 * Detect cadence from text.
 * Returns daily > monthly > yearly > one_time (when one-time hints) > null (ambiguous).
 */
export function detectCadence(text: string): Cadence | null {
  const t = text.trim();

  for (const re of ONE_TIME_PATTERNS) {
    if (re.test(t)) return 'one_time';
  }

  for (const re of DAILY_PATTERNS) {
    if (re.test(t)) return 'daily';
  }

  for (const re of MONTHLY_PATTERNS) {
    if (re.test(t)) return 'monthly';
  }

  for (const re of YEARLY_PATTERNS) {
    if (re.test(t)) return 'yearly';
  }

  return null;
}
