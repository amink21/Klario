/**
 * Test harness for deterministic smart input parser.
 * Run with: npx expo run or: node --require ts-node/register lib/smartInput/examples.ts
 */

import { parseSmartInput } from './deterministicParser';

const examples: string[] = [
  'car insurance May 7 $200 monthly',
  'Feb 28 wash car',
  'coffee today $5',
  'rent $1500 monthly',
  'Netflix 15.99 monthly',
];

function run() {
  const now = new Date('2025-02-16T12:00:00');
  console.log('--- Deterministic Parser Examples ---\n');
  console.log('Reference date:', now.toISOString().slice(0, 10));
  console.log('');

  for (const input of examples) {
    const result = parseSmartInput(input, now);
    console.log(`Input: "${input}"`);
    console.log(`  intent: ${result.intent}`);
    console.log(`  confidence: ${result.confidence.toFixed(2)}`);
    console.log(`  reasons: ${result.reasons.join(', ')}`);
    if (result.reminder) {
      console.log(`  reminder:`, {
        title: result.reminder.title,
        nextDueISO: result.reminder.nextDueISO,
        cadence: result.reminder.cadence,
        remindDaysBefore: result.reminder.remindDaysBefore,
        category: result.reminder.category,
      });
    }
    if (result.spending) {
      console.log(`  spending:`, {
        title: result.spending.title,
        amountCents: result.spending.amountCents,
        dateISO: result.spending.dateISO,
        category: result.spending.category,
      });
    }
    console.log(`  tokens: dates=${result.tokens.dates.join(',') || '[]'}, amounts=${result.tokens.amountsCents.join(',') || '[]'}, cadence=${result.tokens.cadence ?? 'null'}`);
    console.log('');
  }
}

run();
