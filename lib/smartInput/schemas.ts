import { z } from 'zod';
import { SMART_INPUT_CATEGORIES } from '@/lib/ai/schemas';

/** Re-export for Smart Input pipeline; AI output uses this. */
export {
  smartInputParseSchema,
  type SmartInputParseResult,
  SMART_INPUT_CATEGORIES,
} from '@/lib/ai/schemas';

const cadenceSchema = z.enum(['one_time', 'monthly', 'yearly']);

/** Local parse reminder shape (partial + optional dates) */
export const localReminderSchema = z.object({
  title: z.string(),
  category: z.enum(SMART_INPUT_CATEGORIES).catch('Other'),
  nextDueISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dueTime: z.string().regex(/^\d{1,2}:\d{2}$/).nullable().optional(),
  cadence: cadenceSchema.nullable().optional(),
  remindDaysBefore: z.number().int().min(0).max(365).optional(),
  amountCents: z.number().int().nonnegative().optional(),
});

/** Local parse spending shape */
export const localSpendingSchema = z.object({
  title: z.string(),
  category: z.enum(SMART_INPUT_CATEGORIES).catch('Other'),
  amountCents: z.number().int().nonnegative().nullable().optional(),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  cadence: cadenceSchema.nullable().optional(),
});

/** Result of local deterministic parse */
export const localParseResultSchema = z.object({
  intent: z.enum(['reminder', 'spending', 'both', 'unknown']),
  reminder: localReminderSchema.nullable().optional(),
  spending: localSpendingSchema.nullable().optional(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
});

export type LocalParseResult = z.infer<typeof localParseResultSchema>;
export type LocalReminder = z.infer<typeof localReminderSchema>;
export type LocalSpending = z.infer<typeof localSpendingSchema>;
