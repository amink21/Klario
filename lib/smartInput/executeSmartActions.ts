import { generateId } from '@/lib/id';
import { todayISO } from '@/lib/date';
import type { LifeItem, Transaction, Subscription } from '@/lib/types';
import type { SmartInputParseResult } from '@/lib/ai/schemas';
import { normalizeTitleSimple } from './title';

export type ExecuteResult = {
  created: { lifeItemId?: string; transactionId?: string; subscriptionId?: string };
  toastMessage: string;
};

export type CreateLifeItemFn = (item: LifeItem) => Promise<void>;
export type AddTransactionFn = (tx: Transaction) => Promise<void>;
export type AddSubscriptionFn = (sub: Subscription) => Promise<void>;

/**
 * Execute Smart Input actions: create LifeItem, Transaction, and/or Subscription from parsed result.
 * Caller provides storage callbacks. Fills missing dates with today or first of next month when sensible.
 */
export async function executeSmartActions(
  parsed: SmartInputParseResult,
  options: {
    defaultRemindDaysBefore: number;
    createLifeItem: CreateLifeItemFn;
    addTransaction: AddTransactionFn;
    addSubscription: AddSubscriptionFn;
    createReminder: boolean;
    createSpending: boolean;
  }
): Promise<ExecuteResult> {
  const { defaultRemindDaysBefore, createLifeItem, addTransaction, addSubscription, createReminder, createSpending } = options;
  const created: ExecuteResult['created'] = {};
  const toasts: string[] = [];

  const today = todayISO();

  // --- Reminder (LifeItem) ---
  if (createReminder && parsed.reminder != null && parsed.reminder.title) {
    const nextDueISO = parsed.reminder.nextDueISO ?? today;
    const dueTime = parsed.reminder.dueTime ?? undefined;
    const cadence = parsed.reminder.cadence ?? 'one_time';
    const remindDaysBefore = parsed.reminder.remindDaysBefore ?? defaultRemindDaysBefore;
    const remindMinutesBefore = dueTime != null ? 0 : (parsed.reminder.remindMinutesBefore ?? undefined);
    const category = parsed.reminder.category ?? 'Other';
    const amountCents = createSpending && parsed.spending?.amountCents ? parsed.spending.amountCents : undefined;
    const id = generateId();
    const item: LifeItem = {
      id,
      title: normalizeTitleSimple(parsed.reminder.title.trim()) || parsed.reminder.title.trim(),
      category,
      amountCents: amountCents ?? undefined,
      cadence,
      nextDueISO,
      dueTime: dueTime ?? undefined,
      remindDaysBefore,
      remindMinutesBefore,
      status: 'active',
    };
    await createLifeItem(item);
    created.lifeItemId = id;
    toasts.push('reminder');
  }

  // --- Spending: Transaction and/or Subscription ---
  if (createSpending && parsed.spending != null && parsed.spending.title) {
    const amountCents = parsed.spending.amountCents ?? 0;
    const category = parsed.spending.category ?? 'Other';
    const cadence = parsed.spending.cadence ?? 'one_time';
    const dateISO = parsed.spending.dateISO ?? today;

    if (amountCents > 0) {
      const txId = generateId();
      await addTransaction({
        id: txId,
        title: normalizeTitleSimple(parsed.spending.title.trim()) || parsed.spending.title.trim(),
        amountCents,
        category,
        dateISO,
      });
      created.transactionId = txId;
      toasts.push('transaction');
      if (cadence === 'monthly' || cadence === 'yearly') {
        const nextDue = parsed.reminder?.nextDueISO ?? dateISO;
        const subId = generateId();
        await addSubscription({
          id: subId,
          title: normalizeTitleSimple(parsed.spending.title.trim()) || parsed.spending.title.trim(),
          amountCents,
          cadence,
          nextDueISO: nextDue,
          detected: false,
        });
        created.subscriptionId = subId;
      }
    }
  }

  if (toasts.length === 0) {
    return { created, toastMessage: '' };
  }
  if (toasts.includes('reminder') && toasts.includes('transaction')) {
    return { created, toastMessage: 'Added both' };
  }
  if (toasts.includes('reminder')) {
    return { created, toastMessage: 'Added reminder' };
  }
  return { created, toastMessage: 'Added transaction' };
}
