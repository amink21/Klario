/**
 * Deterministic intent engine.
 * NO AI. Rules-based decision.
 */

export type Intent = 'reminder' | 'spending' | 'both' | 'unknown';
import {
  countKeywordHits,
  REMINDER_KEYWORDS,
  SPENDING_KEYWORDS,
  BILLING_RECURRING_KEYWORDS,
} from './keywords';

export type IntentInput = {
  amountPresent: boolean;
  datePresent: boolean;
  cadencePresent: boolean;
  reminderHits: number;
  spendingHits: number;
  recurringHits: number;
  multipleDates: boolean;
  multipleAmounts: boolean;
};

/**
 * Decide intent using deterministic rules.
 * PRIMARY RULES:
 * 1) amount + (cadence OR recurringHits>=1 OR reminderHits>=1 with bill/renew) => both
 * 2) amount + (spendingHits>=1 OR no reminderHits) => spending
 * 3) datePresent => reminder
 * 4) amountPresent => spending (date defaults today, lower confidence)
 * 5) else => unknown
 *
 * Edge rules:
 * - Only reminder keywords, no date, no amount => unknown
 * - Multiple dates AND multiple amounts => unknown unless strong recurring cues
 */
export function decideIntent(input: IntentInput): Intent {
  const {
    amountPresent,
    datePresent,
    cadencePresent,
    reminderHits,
    spendingHits,
    recurringHits,
    multipleDates,
    multipleAmounts,
  } = input;

  const hasBillRenewVerb = reminderHits >= 1; // pay, due, renew, bill, etc.

  // BOTH: amount + (cadence OR recurring OR reminder with bill/renew)
  if (amountPresent && (cadencePresent || recurringHits >= 1 || hasBillRenewVerb)) {
    if (multipleDates && multipleAmounts && !cadencePresent && recurringHits === 0) {
      return 'unknown'; // ambiguous
    }
    return 'both';
  }

  // SPENDING: amount + (spending keywords OR no reminder keywords)
  if (amountPresent && (spendingHits >= 1 || reminderHits === 0)) {
    return 'spending';
  }

  // REMINDER: date present, no amount (or amount but we didn't hit both)
  if (datePresent && !amountPresent) {
    return 'reminder';
  }

  // REMINDER: date + amount but didn't qualify for both (e.g. weak recurring) - treat as reminder if date-driven
  if (datePresent && amountPresent && reminderHits >= 1 && spendingHits === 0) {
    return 'both'; // e.g. "car insurance May 7 $200" - has date, amount, reminder keyword
  }

  // SPENDING: amount only, no date (date will default to today)
  if (amountPresent) {
    return 'spending';
  }

  // REMINDER: date only
  if (datePresent) {
    return 'reminder';
  }

  // Unknown: only reminder keywords, no date, no amount
  if (reminderHits >= 1 && !datePresent && !amountPresent) {
    return 'unknown';
  }

  return 'unknown';
}

/**
 * Build IntentInput from raw text and extracted tokens.
 */
export function buildIntentInput(
  text: string,
  opts: {
    amountPresent: boolean;
    datePresent: boolean;
    cadencePresent: boolean;
    multipleDates: boolean;
    multipleAmounts: boolean;
  }
): IntentInput {
  return {
    ...opts,
    reminderHits: countKeywordHits(text, REMINDER_KEYWORDS),
    spendingHits: countKeywordHits(text, SPENDING_KEYWORDS),
    recurringHits: countKeywordHits(text, BILLING_RECURRING_KEYWORDS),
  };
}
