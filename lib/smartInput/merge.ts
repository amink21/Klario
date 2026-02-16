import type { SmartInputParseResult } from '@/lib/ai/schemas';
import { localToSmartResult } from './localParse';
import type { LocalParseResult } from './schemas';

/**
 * Merge local and AI parse results. Prefer AI when AI confidence >= local confidence + 0.05,
 * otherwise keep local. Ensure required fields for chosen intent; if missing, set intent to unknown.
 */
export function mergeParsed(
  localResult: LocalParseResult,
  aiResult: SmartInputParseResult | null,
  nowISO: string
): SmartInputParseResult {
  const localSmart = localToSmartResult(localResult, nowISO);

  if (aiResult == null) {
    return ensureRequiredFields(localSmart, nowISO);
  }

  const useAI = aiResult.confidence >= localResult.confidence + 0.05;

  const merged: SmartInputParseResult = {
    intent: useAI ? aiResult.intent : localSmart.intent,
    confidence: useAI ? aiResult.confidence : localSmart.confidence,
    reminder:
      useAI && aiResult.reminder != null
        ? { ...localSmart.reminder, ...aiResult.reminder } as SmartInputParseResult['reminder']
        : localSmart.reminder != null
          ? { ...aiResult.reminder, ...localSmart.reminder } as SmartInputParseResult['reminder']
          : (aiResult.reminder ?? localSmart.reminder),
    spending:
      useAI && aiResult.spending != null
        ? { ...localSmart.spending, ...aiResult.spending } as SmartInputParseResult['spending']
        : localSmart.spending != null
          ? { ...aiResult.spending, ...localSmart.spending } as SmartInputParseResult['spending']
          : (aiResult.spending ?? localSmart.spending),
  };

  return ensureRequiredFields(merged, nowISO);
}

function ensureRequiredFields(result: SmartInputParseResult, nowISO: string): SmartInputParseResult {
  let { intent, reminder, spending } = result;

  if (intent === 'reminder' || intent === 'both') {
    if (reminder && !reminder.nextDueISO) {
      reminder = { ...reminder, nextDueISO: nowISO };
    }
    if (intent === 'reminder' && (!reminder || !reminder.nextDueISO)) {
      intent = 'unknown';
    }
  }

  if (intent === 'spending' || intent === 'both') {
    const hasAmount = spending && (spending.amountCents ?? 0) > 0;
    if (spending && !spending.dateISO) {
      spending = { ...spending, dateISO: nowISO };
    }
    if (intent === 'spending' && (!spending || !hasAmount)) {
      intent = 'unknown';
    }
  }

  if (intent === 'both') {
    const remOk = reminder?.nextDueISO;
    const spendOk = spending && (spending.amountCents ?? 0) > 0;
    if (!remOk || !spendOk) {
      intent = 'unknown';
    }
  }

  return {
    intent,
    reminder: reminder ?? null,
    spending: spending ?? null,
    confidence: result.confidence,
  };
}
