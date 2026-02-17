/**
 * Robust money extraction from free-form text.
 * NO AI. Pure regex + deterministic rules.
 */

export type MoneyResult = {
  amountsCents: number[];
  currency: 'CAD' | 'USD' | null;
};

/** Parse a numeric string with optional thousands separators (comma or space) into dollars. */
function parseDollarAmount(raw: string): number {
  const cleaned = raw.replace(/[\s,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Convert dollars to cents. */
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Extract all monetary amounts from text.
 * Supports: $5, $5.00, 5$, 5.00, CAD 5, USD 5, 1,200, 1200, 1 200
 * Prefers amounts with currency symbol/code.
 * Returns all amounts in cents; primary is typically largest or last (caller can choose).
 */
export function extractAmounts(text: string): MoneyResult {
  const amountsCents: number[] = [];
  const seen = new Set<number>();
  let currency: 'CAD' | 'USD' | null = null;

  // Patterns with explicit currency (highest priority)
  const patterns: Array<{
    regex: RegExp;
    currency?: 'CAD' | 'USD';
    isCents?: boolean;
  }> = [
    { regex: /\bCAD\s*\$?\s*([\d,.\s]+)/gi, currency: 'CAD' },
    { regex: /\bUSD\s*\$?\s*([\d,.\s]+)/gi, currency: 'USD' },
    { regex: /\$?\s*([\d,.\s]+)\s*(?:CAD|CDN)\b/gi, currency: 'CAD' },
    { regex: /\$?\s*([\d,.\s]+)\s*(?:USD)\b/gi, currency: 'USD' },
    { regex: /\$\s*([\d,.\s]+)/g },
    { regex: /([\d,.\s]+)\s*\$(\s|$|[,.])/g },
    { regex: /\b(\d+(?:\.\d{1,2})?)\s*dollars?\b/gi },
    { regex: /\b(\d+)\s*cents?\b/gi, isCents: true },
    // Decimal amounts (avoid matching "7" in "May 7" - require decimal or 4+ digits)
    { regex: /\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/g },
    { regex: /\b(\d{4,}(?:\.\d{1,2})?)\b/g },
    { regex: /\b(\d{1,3}\s\d{3}(?:\.\d{1,2})?)\b/g },
    { regex: /\b(\d+\.\d{1,2})\b/g },
  ];

  for (const { regex, currency: c, isCents } of patterns) {
    const copy = new RegExp(regex.source, regex.flags);
    let m: RegExpExecArray | null;
    while ((m = copy.exec(text)) !== null) {
      const raw = m[1]?.trim() ?? m[0];
      if (!raw) continue;

      const dollars = parseDollarAmount(raw);
      const value = isCents ? Math.round(dollars) : dollarsToCents(dollars);
      if (value <= 0) continue;
      if (seen.has(value)) continue;

      // Skip likely date numbers: day-of-month (1-31) when preceded by month name
      const rawNum = raw.replace(/[,.\s]/g, '');
      if (!isCents && /^\d{1,2}$/.test(rawNum)) {
        const n = parseInt(rawNum, 10);
        if (n >= 1 && n <= 31) {
          const idx = m.index;
          const before = text.slice(Math.max(0, idx - 25), idx);
          if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*$/i.test(before)) continue;
        }
      }

      seen.add(value);
      amountsCents.push(value);
      if (c) currency = c;
    }
  }

  // Default CAD if in North American format ($)
  if (currency == null && amountsCents.length > 0 && /\$|CAD|CDN|dollars?/i.test(text)) {
    currency = 'CAD';
  }

  return { amountsCents: [...amountsCents], currency };
}
