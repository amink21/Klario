/**
 * Title normalization / cleanup.
 * Remove date phrases, currency tokens, cadence words, filler, commas, "remind" etc.
 * Output: clean Title Case (e.g. "remind make food, today 12pm" → "Make Food").
 */

/** Strip commas, extra whitespace, and known filler/keywords from raw text (no opts). */
function cleanTitleRaw(text: string): string {
  return String(text)
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove detected tokens from text and produce a simple clean title.
 * - Commas and extra whitespace (always)
 * - remind, reminder, remind me, remember to, need to, etc.
 * - Date phrases (today, tomorrow, May 7, etc.)
 * - Currency ($5, 5.00, CAD 5)
 * - Cadence (monthly, yearly)
 * - Time (12pm, at 12:00, etc.)
 */
export function normalizeTitle(
  text: string,
  opts: {
    datePhrases: string[];
    amountsCents: number[];
    cadenceWords?: string[];
  }
): string {
  let out = cleanTitleRaw(text)
    .replace(/\b(remind|reminder|remind me to?|remember to?|need to|please remind|don't forget|dont forget)\b/gi, ' ')
    .replace(/\b(please|pay for|add|remember|schedule|set reminder)\b/gi, ' ')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{1,2}\b/gi, ' ')
    .replace(/\$\s*[\d,.\s]+/g, '')
    .replace(/[\d,.\s]+\s*\$/g, '')
    .replace(/\bCAD\s*[\d,.\s]+/gi, '')
    .replace(/\bUSD\s*[\d,.\s]+/gi, '')
    .replace(/\b[\d,.\s]+\s*dollars?\b/gi, '')
    .replace(/\b[\d]+\s*cents?\b/gi, '')
    .replace(/\b(daily|every day|each day|per day|weekly|every week|per week|each week|monthly|yearly|every month|per month|annually|each year)\b/gi, ' ')
    .replace(/\b(today|tomorrow)\b/gi, ' ')
    .replace(/\bremind\s+\d+\s*(?:mins?|minutes?)\s*before\b/gi, ' ')
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi, ' ')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const d of opts.datePhrases) {
    out = out.replace(new RegExp(d.replace(/-/g, '-'), 'gi'), ' ').replace(/\s+/g, ' ').trim();
  }

  for (const cents of opts.amountsCents) {
    const asDollars = (cents / 100).toString();
    const escaped = asDollars.replace('.', '\\.');
    out = out.replace(new RegExp(escaped, 'g'), ' ').replace(/\s+/g, ' ').trim();
  }

  out = out.replace(/\s+/g, ' ').trim();
  if (out) return toTitleCase(out);
  return normalizeTitleSimple(text);
}

/**
 * Clean and title-case a string when you don't have date/amount opts.
 * Use for a final pass on any title (e.g. from merge or edit).
 */
export function normalizeTitleSimple(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let out = cleanTitleRaw(text)
    .replace(/\b(remind|reminder|remind me to?|remember to?|need to|please remind|don't forget|dont forget)\b/gi, ' ')
    .replace(/\b(please|pay for|add|remember|schedule|set reminder)\b/gi, ' ')
    .replace(/\b(today|tomorrow)\b/gi, ' ')
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi, ' ')
    .replace(/\b(daily|every day|each day|per day|weekly|every week|per week|each week|monthly|yearly|every month|per month|annually|each year)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return toTitleCase(out || cleanTitleRaw(text));
}

/** Convert "car insurance" => "Car Insurance" */
function toTitleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}
