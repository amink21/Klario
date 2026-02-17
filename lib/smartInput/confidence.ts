/**
 * Confidence scoring for deterministic parse.
 * Base 0.3, add/subtract based on signals, clamp 0..1.
 * Return reasons for debugging.
 */

export type ConfidenceInput = {
  datePresent: boolean;
  amountPresent: boolean;
  cadencePresent: boolean;
  strongKeywordMatch: boolean;
  multipleDates: boolean;
  multipleAmounts: boolean;
  weakHeuristic: boolean; // e.g. amount but no keywords
};

const BASE = 0.3;
const BONUS_DATE = 0.25;
const BONUS_AMOUNT = 0.25;
const BONUS_CADENCE = 0.15;
const BONUS_KEYWORD = 0.1;
const PENALTY_MULTI_DATE = 0.2;
const PENALTY_MULTI_AMOUNT = 0.2;
const PENALTY_WEAK = 0.15;

export function computeConfidence(input: ConfidenceInput): { confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = BASE;
  reasons.push('base');

  if (input.datePresent) {
    score += BONUS_DATE;
    reasons.push('date_present');
  }
  if (input.amountPresent) {
    score += BONUS_AMOUNT;
    reasons.push('amount_present');
  }
  if (input.cadencePresent) {
    score += BONUS_CADENCE;
    reasons.push('cadence_present');
  }
  if (input.strongKeywordMatch) {
    score += BONUS_KEYWORD;
    reasons.push('strong_keyword');
  }
  if (input.multipleDates) {
    score -= PENALTY_MULTI_DATE;
    reasons.push('multiple_dates');
  }
  if (input.multipleAmounts) {
    score -= PENALTY_MULTI_AMOUNT;
    reasons.push('multiple_amounts');
  }
  if (input.weakHeuristic) {
    score -= PENALTY_WEAK;
    reasons.push('weak_heuristic');
  }

  const confidence = Math.max(0, Math.min(1, score));
  return { confidence, reasons };
}
