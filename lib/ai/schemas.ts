import { z } from 'zod';

/** Predefined transaction categories for AI categorization */
export const TRANSACTION_CATEGORIES = [
  'Housing',
  'Utilities',
  'Subscriptions',
  'Food',
  'Transport',
  'Health',
  'Insurance',
  'Entertainment',
  'Other',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

const cadenceSchema = z.enum(['one_time', 'daily', 'monthly', 'yearly']);
const subscriptionCadenceSchema = z.enum(['monthly', 'yearly']);

/** AI output for life item extraction (Smart Add) */
export const lifeItemExtractSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  amountCents: z.number().int().nonnegative().optional(),
  cadence: cadenceSchema,
  nextDueISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  remindDaysBefore: z.number().int().min(0).max(365),
  confidence: z.number().min(0).max(1),
});

export type LifeItemExtract = z.infer<typeof lifeItemExtractSchema>;

/** AI output for transaction categorization */
export const transactionCategorySchema = z.object({
  category: z.enum(TRANSACTION_CATEGORIES),
  confidence: z.number().min(0).max(1),
});

export type TransactionCategoryResult = z.infer<typeof transactionCategorySchema>;

/** AI output for daily brief */
export const dailyBriefSchema = z.object({
  lines: z.array(z.string()).max(4).min(1),
});

export type DailyBriefResult = z.infer<typeof dailyBriefSchema>;

/** AI output for subscription detection */
export const subscriptionDetectionSchema = z.object({
  isSubscription: z.boolean(),
  cadence: subscriptionCadenceSchema.optional(),
  estimatedNextDueISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confidence: z.number().min(0).max(1),
});

export type SubscriptionDetectionResult = z.infer<typeof subscriptionDetectionSchema>;

/** Categories for Smart Input (same set as transactions) */
export const SMART_INPUT_CATEGORIES = [
  'Food',
  'Transport',
  'Subscriptions',
  'Insurance',
  'Health',
  'Utilities',
  'Housing',
  'Entertainment',
  'Other',
] as const;

/** Time 24h "HH:mm" or "H:mm" */
const timeHHMMSchema = z.string().regex(/^\d{1,2}:\d{2}$/).nullable().optional();
const smartInputReminderSchema = z.object({
  title: z.string().min(1),
  category: z.enum(SMART_INPUT_CATEGORIES),
  nextDueISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dueTime: timeHHMMSchema,
  cadence: z.enum(['one_time', 'daily', 'monthly', 'yearly']).nullable(),
  remindDaysBefore: z.number().int().min(0).max(365).nullable(),
  remindMinutesBefore: z.number().int().min(1).max(1440).nullable().optional(),
});

const smartInputSpendingSchema = z.object({
  title: z.string().min(1),
  category: z.enum(SMART_INPUT_CATEGORIES),
  amountCents: z.number().int().nonnegative().nullable(),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  cadence: z.enum(['one_time', 'daily', 'monthly', 'yearly']).nullable(),
});

/** AI output for Smart Input parse */
export const smartInputParseSchema = z.object({
  intent: z.enum(['reminder', 'spending', 'both', 'unknown']),
  reminder: smartInputReminderSchema.nullable(),
  spending: smartInputSpendingSchema.nullable(),
  confidence: z.number().min(0).max(1),
});

export type SmartInputParseResult = z.infer<typeof smartInputParseSchema>;

/** AI output for Subscription Waste Detector (lenient for model variation) */
export const subscriptionWasteSchema = z.object({
  groups: z.array(
    z.object({
      groupName: z.string().catch('Other'),
      totalMonthlyCents: z.number().int().nonnegative().catch(0),
      count: z.number().int().min(0).catch(0),
      itemTitles: z.array(z.string()).catch([]),
      insight: z.string().optional(),
    })
  ).catch([]),
  summaryLines: z.array(z.string()).min(0).max(10).catch([]),
  potentialSavingsCents: z.number().int().nonnegative().optional(),
}).transform((d) => ({
  ...d,
  summaryLines: d.summaryLines.length > 0 ? d.summaryLines : ['No summary generated.'],
}));
export type SubscriptionWasteResult = z.infer<typeof subscriptionWasteSchema>;
