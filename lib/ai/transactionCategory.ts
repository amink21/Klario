import { callAI } from './client';
import {
  transactionCategorySchema,
  type TransactionCategoryResult,
  TRANSACTION_CATEGORIES,
} from './schemas';

const CONFIDENCE_FALLBACK_THRESHOLD = 0.5;

export interface CategorizeTransactionInput {
  title: string;
  merchant?: string;
  amountCents: number;
}

/**
 * AI transaction categorization.
 * Returns category from predefined list; if confidence < 0.5, use "Other".
 */
export async function categorizeTransactionWithAI(
  input: CategorizeTransactionInput
): Promise<TransactionCategoryResult> {
  const raw = await callAI<unknown>('transaction_category', input);
  const parsed = transactionCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { category: 'Other', confidence: 0 };
  }
  const result = parsed.data;
  if (result.confidence < CONFIDENCE_FALLBACK_THRESHOLD) {
    return { category: 'Other', confidence: result.confidence };
  }
  return result;
}

export { TRANSACTION_CATEGORIES };
