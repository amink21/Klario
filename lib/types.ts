export type Cadence = 'one_time' | 'monthly' | 'yearly';
export type LifeItemStatus = 'active' | 'cancelled';

export interface LifeItem {
  id: string;
  title: string;
  category: string;
  amountCents?: number;
  cadence: Cadence;
  nextDueISO: string;
  /** Optional time of day (24h) e.g. "19:00" for 7pm, "01:00" for 1am */
  dueTime?: string | null;
  remindDaysBefore: number;
  status: LifeItemStatus;
  notes?: string;
  /** Notification identifier for cancelling scheduled reminder */
  notificationId?: string | null;
}

export interface Transaction {
  id: string;
  title: string;
  /** Signed: positive = money out (expense), negative = money in (income). */
  amountCents: number;
  category: string;
  dateISO: string;
  merchant?: string;
}

export type SubscriptionCadence = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  title: string;
  amountCents: number;
  cadence: SubscriptionCadence;
  nextDueISO: string;
  detected: boolean;
  /** When created via AI subscription detection */
  aiMeta?: { confidence: number };
}

export interface SettingsState {
  morningBrief: boolean;
  dueItemReminders: boolean;
  defaultRemindDaysBefore: 7 | 14 | 30;
}

export type LifeStatus = 'Stable' | 'Watch' | 'Action Needed';
