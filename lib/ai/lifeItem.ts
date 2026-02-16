import { callAI } from './client';
import { lifeItemExtractSchema, type LifeItemExtract } from './schemas';

const CONFIDENCE_WARN_THRESHOLD = 0.6;

export interface ParseLifeItemResult {
  data: LifeItemExtract;
  lowConfidence: boolean;
}

/**
 * AI Smart Add: parse natural language into structured life item fields.
 * Validate with Zod; if confidence < 0.6, warn user to review manually.
 */
export async function parseLifeItemWithAI(input: string): Promise<ParseLifeItemResult> {
  const raw = await callAI<unknown>('extract_life_item', input);
  const parsed = lifeItemExtractSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`AI returned invalid shape: ${parsed.error.message}`);
  }
  const data = parsed.data;
  return {
    data,
    lowConfidence: data.confidence < CONFIDENCE_WARN_THRESHOLD,
  };
}
