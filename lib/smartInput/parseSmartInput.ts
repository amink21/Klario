import { callAI } from '@/lib/ai/client';
import { smartInputParseSchema, type SmartInputParseResult } from '@/lib/ai/schemas';

const CONFIDENCE_THRESHOLD = 0.6;

export type ParseSmartInputOut =
  | { ok: true; parsed: SmartInputParseResult; needReview: boolean }
  | { ok: false; error: string };

/**
 * Call AI to parse Smart Input text. Validate with Zod.
 * needReview = true when confidence < 0.6 or intent unknown or missing required fields.
 */
export async function parseSmartInput(text: string): Promise<ParseSmartInputOut> {
  try {
    const raw = await callAI<unknown>('smart_input_parse', text);
    const result = smartInputParseSchema.safeParse(raw);
    if (!result.success) {
      return { ok: false, error: 'Invalid response from AI' };
    }
    const parsed = result.data;
    const needReview =
      parsed.confidence < CONFIDENCE_THRESHOLD ||
      parsed.intent === 'unknown' ||
      (parsed.intent !== 'spending' && parsed.reminder != null && !parsed.reminder.nextDueISO) ||
      (parsed.intent !== 'reminder' && parsed.spending != null && (parsed.spending.amountCents == null || parsed.spending.amountCents <= 0));
    return { ok: true, parsed, needReview };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message ?? 'Couldn’t parse—please try again',
    };
  }
}
