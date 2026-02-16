import { callAI } from './client';
import {
  subscriptionDetectionSchema,
  type SubscriptionDetectionResult,
} from './schemas';

export interface SubscriptionDetectionInput {
  merchant: string;
  transactionDates: string[];
  amounts: number[];
}

const CONFIDENCE_CREATE_THRESHOLD = 0.7;

/**
 * AI subscription detection. Only treat as subscription if confidence > 0.7.
 * Caller should create subscription with detected=true and store aiMeta: { confidence }.
 */
export async function detectSubscriptionWithAI(
  input: SubscriptionDetectionInput
): Promise<SubscriptionDetectionResult> {
  const raw = await callAI<unknown>('subscription_detection', input);
  const parsed = subscriptionDetectionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      isSubscription: false,
      confidence: 0,
    };
  }
  return parsed.data;
}

/** Only create subscription when AI confidence exceeds threshold */
export function shouldCreateSubscription(result: SubscriptionDetectionResult): boolean {
  return result.isSubscription && result.confidence > CONFIDENCE_CREATE_THRESHOLD;
}
