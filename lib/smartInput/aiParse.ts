import { callAI } from '@/lib/ai/client';
import { smartInputParseSchema, type SmartInputParseResult } from '@/lib/ai/schemas';
import type { LocalParseResult } from './schemas';

const CONFIDENCE_THRESHOLD = 0.75;

/**
 * Whether we should call AI: local confidence too low, intent unknown, or missing required fields.
 */
export function shouldCallAI(local: LocalParseResult, nowISO: string): boolean {
  if (local.confidence >= CONFIDENCE_THRESHOLD && local.intent !== 'unknown') {
    const reminderOk =
      local.intent !== 'reminder' &&
      local.intent !== 'both' &&
      (local.reminder == null || local.reminder.nextDueISO != null);
    const spendingOk =
      local.intent !== 'spending' &&
      local.intent !== 'both' &&
      (local.spending == null || (local.spending.amountCents != null && local.spending.amountCents > 0));
    if (reminderOk && spendingOk) return false;
    // Check required fields for chosen intent
    if (local.intent === 'reminder' && local.reminder?.nextDueISO) return false;
    if (local.intent === 'spending' && local.spending && (local.spending.amountCents ?? 0) > 0) return false;
    if (local.intent === 'both') {
      if (
        local.reminder?.nextDueISO &&
        local.spending &&
        (local.spending.amountCents ?? 0) > 0
      )
        return false;
    }
  }
  return (
    local.confidence < CONFIDENCE_THRESHOLD ||
    local.intent === 'unknown' ||
    (local.intent === 'reminder' && !local.reminder?.nextDueISO) ||
    (local.intent === 'spending' && (!local.spending?.amountCents || local.spending.amountCents <= 0)) ||
    (local.intent === 'both' &&
      (!local.reminder?.nextDueISO || !local.spending?.amountCents || local.spending.amountCents <= 0))
  );
}

/**
 * Call OpenAI/OpenRouter to parse smart input. Returns validated SmartInputParseResult or throws.
 */
export async function aiParseSmartInput(text: string, nowISO: string): Promise<SmartInputParseResult> {
  const raw = await callAI<unknown>('smart_input_parse', { text, nowISO });
  const result = smartInputParseSchema.safeParse(raw);
  if (!result.success) {
    throw new Error('Invalid AI response');
  }
  return result.data;
}
