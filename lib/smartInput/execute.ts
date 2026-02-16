import type { SmartInputParseResult } from '@/lib/ai/schemas';
import type { LifeItem, Transaction, Subscription } from '@/lib/types';
import { executeSmartActions } from './executeSmartActions';

export type CreatedKind = 'reminder' | 'spending';

export interface ExecuteSmartInputResult {
  created: CreatedKind[];
  ids: string[];
  toastMessage: string;
}

export type CreateLifeItemFn = (item: LifeItem) => Promise<void>;
export type AddTransactionFn = (tx: Transaction) => Promise<void>;
export type AddSubscriptionFn = (sub: Subscription) => Promise<void>;

/**
 * Execute Smart Input: create LifeItem (with notification), Transaction, and/or Subscription.
 * Caller must provide storage/notification callbacks (e.g. from store + scheduleDueReminder).
 */
export async function executeSmartInput(
  finalResult: SmartInputParseResult,
  options: {
    defaultRemindDaysBefore: number;
    createLifeItem: CreateLifeItemFn;
    addTransaction: AddTransactionFn;
    addSubscription: AddSubscriptionFn;
  }
): Promise<ExecuteSmartInputResult> {
  const createReminder =
    (finalResult.intent === 'reminder' || finalResult.intent === 'both') &&
    finalResult.reminder != null &&
    finalResult.reminder.nextDueISO != null;
  const createSpending =
    (finalResult.intent === 'spending' || finalResult.intent === 'both') &&
    finalResult.spending != null &&
    (finalResult.spending.amountCents ?? 0) > 0;

  const out = await executeSmartActions(finalResult, {
    ...options,
    createReminder,
    createSpending,
  });

  const created: CreatedKind[] = [];
  const ids: string[] = [];
  if (out.created.lifeItemId) {
    created.push('reminder');
    ids.push(out.created.lifeItemId);
  }
  if (out.created.transactionId) {
    created.push('spending');
    ids.push(out.created.transactionId);
  }
  if (out.created.subscriptionId) {
    ids.push(out.created.subscriptionId);
  }

  return {
    created,
    ids,
    toastMessage: out.toastMessage,
  };
}
