/**
 * Dev-only helpers to test AI features from the app (e.g. a "Test AI" button in Settings).
 * Call runAITest() and show the result in an Alert or on screen.
 */

import { parseLifeItemWithAI } from './lifeItem';
import { categorizeTransactionWithAI } from './transactionCategory';
import { generateDailyBrief } from './dailyBrief';
import { detectSubscriptionWithAI, shouldCreateSubscription } from './subscriptionDetection';
import type { AIError } from './client';

export type AITestResult = { ok: true; message: string } | { ok: false; error: string };

/** Run a single quick test (Smart Add) and return a message for display. */
export async function runAITest(): Promise<AITestResult> {
  try {
    const input = 'Car insurance renews March 12 yearly $1400';
    const { data, lowConfidence } = await parseLifeItemWithAI(input);
    const lines = [
      'Smart Add test:',
      `Title: ${data.title}`,
      `Category: ${data.category}`,
      `Due: ${data.nextDueISO} (${data.cadence})`,
      data.amountCents != null ? `Amount: $${(data.amountCents / 100).toFixed(2)}` : '',
      `Confidence: ${(data.confidence * 100).toFixed(0)}%${lowConfidence ? ' (low – review suggested)' : ''}`,
    ].filter(Boolean);
    return { ok: true, message: lines.join('\n') };
  } catch (e) {
    const err = e as AIError;
    const code = err.code ?? 'unknown';
    if (code === 'rate_limit') {
      return {
        ok: false,
        error: 'Rate limit exceeded. Wait a minute and try again, or check your OpenRouter usage at openrouter.ai.',
      };
    }
    const msg = err.message ?? String(e);
    return { ok: false, error: `${code}: ${msg}` };
  }
}

/** Run only the morning/daily brief and return the generated lines (or error). */
export async function runMorningBriefTest(): Promise<AITestResult> {
  try {
    const brief = await generateDailyBrief({
      upcomingItems: [
        { title: 'Car insurance', nextDueISO: new Date().toISOString().slice(0, 10) },
        { title: 'Phone bill', nextDueISO: new Date().toISOString().slice(0, 10) },
      ],
      dueSoonCount: 2,
      forecastAmount: 52000,
      yesterdaySpend: 3500,
      topSpendCategory: 'Food',
    });
    const message = brief.lines.length
      ? brief.lines.map((line, i) => `${i + 1}. ${line}`).join('\n\n')
      : 'No lines generated.';
    return { ok: true, message };
  } catch (e) {
    const err = e as AIError;
    if (err.code === 'rate_limit') {
      return {
        ok: false,
        error: 'Rate limit exceeded. Wait a minute and try again, or check your OpenRouter usage at openrouter.ai.',
      };
    }
    return { ok: false, error: (e as Error).message ?? String(e) };
  }
}

/** Run all four AI features and return a combined result (for dev testing). */
export async function runAllAITests(): Promise<AITestResult> {
  const parts: string[] = [];
  try {
    const input = 'Car insurance renews March 12 yearly $1400';
    const life = await parseLifeItemWithAI(input);
    parts.push(`1) Smart Add: ${life.data.title} (${(life.data.confidence * 100).toFixed(0)}%)`);
  } catch (e) {
    parts.push(`1) Smart Add: FAIL - ${(e as Error).message}`);
  }

  try {
    const cat = await categorizeTransactionWithAI({
      title: 'Spotify - $14.99',
      merchant: 'Spotify',
      amountCents: 1499,
    });
    parts.push(`2) Category: ${cat.category} (${(cat.confidence * 100).toFixed(0)}%)`);
  } catch (e) {
    parts.push(`2) Category: FAIL - ${(e as Error).message}`);
  }

  try {
    const brief = await generateDailyBrief({
      upcomingItems: [{ title: 'Test bill', nextDueISO: new Date().toISOString().slice(0, 10) }],
      dueSoonCount: 1,
      forecastAmount: 50000,
      yesterdaySpend: 2000,
      topSpendCategory: 'Food',
    });
    parts.push(`3) Brief: ${brief.lines.length} lines`);
  } catch (e) {
    parts.push(`3) Brief: FAIL - ${(e as Error).message}`);
  }

  try {
    const sub = await detectSubscriptionWithAI({
      merchant: 'Spotify',
      transactionDates: ['2025-01-08', '2025-02-08', '2025-03-08'],
      amounts: [1499, 1499, 1499],
    });
    parts.push(
      `4) Subscription: ${sub.isSubscription ? 'yes' : 'no'} (${(sub.confidence * 100).toFixed(0)}%), create=${shouldCreateSubscription(sub)}`
    );
  } catch (e) {
    parts.push(`4) Subscription: FAIL - ${(e as Error).message}`);
  }

  return { ok: true, message: parts.join('\n') };
}
