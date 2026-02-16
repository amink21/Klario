import { todayISO } from './date';

export interface ParsedStatementLine {
  title: string;
  amountCents: number;
  category: string;
  dateISO: string;
}

/** Keyword rules: phrase or regex → category. First match wins. */
const CATEGORY_RULES: { pattern: RegExp | string; category: string }[] = [
  { pattern: /\b(starbucks|tim hortons|dunkin|coffee|espresso|cafe)\b/i, category: 'Coffee' },
  { pattern: /\b(grocery|supermarket|walmart|costco|metro|sobeys|food basics|freshco)\b/i, category: 'Groceries' },
  { pattern: /\b(restaurant|mcdonald|burger|pizza|uber eats|doordash|skip)\b/i, category: 'Food' },
  { pattern: /\b(gas|shell|esso|petro|chevron|fuel)\b/i, category: 'Transport' },
  { pattern: /\b(amazon|ebay|etsy)\b/i, category: 'Shopping' },
  { pattern: /\b(netflix|spotify|disney|apple music|youtube)\b/i, category: 'Subscriptions' },
  { pattern: /\b(rent|mortgage|hydro|electric|water|gas bill|internet|phone bill|insurance)\b/i, category: 'Bills' },
  { pattern: /\b(pharmacy|shoppers|rexall)\b/i, category: 'Health' },
  { pattern: /\b(gym|fitness|yoga)\b/i, category: 'Fitness' },
  { pattern: /\b(bank|transfer|withdrawal|atm)\b/i, category: 'Transfer' },
  { pattern: /\b(payroll|salary|deposit|income)\b/i, category: 'Income' },
];

function inferCategory(description: string): string {
  const lower = description.toLowerCase().trim();
  for (const { pattern, category } of CATEGORY_RULES) {
    if (typeof pattern === 'string') {
      if (lower.includes(pattern.toLowerCase())) return category;
    } else {
      if (pattern.test(lower)) return category;
    }
  }
  return 'Other';
}

function toTitleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Parse a statement line: find amount (with optional minus) and use rest as description.
 * Handles: "-$12.34 DESCRIPTION", "DESCRIPTION $12.34", "DESCRIPTION 12.34", "DESCRIPTION -50.00"
 */
function parseLine(line: string): { title: string; amountCents: number } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Match amount: optional minus, optional $, digits and optional .XX
  const amountMatch = trimmed.match(/-?\$?\s*(\d+(?:\.\d{1,2})?)\s*$/);
  if (amountMatch) {
    const rawAmount = amountMatch[0].replace(/\s/g, '').replace('$', '');
    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount === 0) return null;
    const title = trimmed.slice(0, amountMatch.index).trim().replace(/-?\$?\s*\d+(?:\.\d{1,2})?\s*$/, '').trim();
    if (!title) return null;
    return { title: toTitleCase(title), amountCents: Math.round(Math.abs(amount) * 100) };
  }

  // Match amount at start: "-$12.34 DESCRIPTION" or "$12.34 DESCRIPTION"
  const startMatch = trimmed.match(/^(-?\$?\s*\d+(?:\.\d{1,2})?)\s+(.+)$/);
  if (startMatch) {
    const amountStr = startMatch[1].replace(/[$\s]/g, '');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) return null;
    const title = startMatch[2].trim();
    if (!title) return null;
    return { title: toTitleCase(title), amountCents: Math.round(Math.abs(amount) * 100) };
  }

  return null;
}

/**
 * Parse multi-line statement text into transactions with auto-categorized category.
 * Each line should contain an amount and a description; default date is today.
 */
export function parseStatement(text: string): ParsedStatementLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const today = todayISO();
  const result: ParsedStatementLine[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const category = inferCategory(parsed.title);
    result.push({
      title: parsed.title,
      amountCents: parsed.amountCents,
      category,
      dateISO: today,
    });
  }

  return result;
}

/** Parse a single CSV row (handles quoted fields with commas). */
function parseCSVRow(row: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  out.push(current.trim());
  return out;
}

/** Try to parse date string to YYYY-MM-DD. Handles MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD. */
function parseDateToISO(s: string): string {
  const cleaned = s.replace(/"/g, '').trim();
  const parts = cleaned.split(/[-/\s]/);
  if (parts.length >= 3) {
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    const c = parseInt(parts[2], 10);
    let year: number, month: number, day: number;
    if (a > 31) {
      year = a;
      month = b - 1;
      day = c;
    } else if (c > 31) {
      day = a;
      month = b - 1;
      year = c;
    } else if (a <= 12 && b <= 31) {
      month = a - 1;
      day = b;
      year = c < 100 ? 2000 + c : c;
    } else {
      day = a;
      month = b - 1;
      year = c < 100 ? 2000 + c : c;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return todayISO();
}

/**
 * Parse file content (CSV or plain text) into transactions.
 * CSV: first row = header; looks for Date, Description, Amount (or Debit/Credit) columns.
 */
export function parseStatementFromFileContent(text: string): ParsedStatementLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0];
  const isCSV = first.includes(',') && (first.toLowerCase().includes('date') || first.toLowerCase().includes('amount') || first.toLowerCase().includes('description'));
  if (isCSV && lines.length > 1) {
    const header = parseCSVRow(lines[0].toLowerCase());
    const dateIdx = header.findIndex((h) => /date|transaction date/.test(h));
    const descIdx = header.findIndex((h) => /description|memo|details|merchant|name/.test(h));
    const amountIdx = header.findIndex((h) => /amount|debit|withdrawal/.test(h));
    const creditIdx = header.findIndex((h) => /credit|deposit/.test(h));

    const result: ParsedStatementLine[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVRow(lines[i]);
      const desc = (descIdx >= 0 ? cells[descIdx] : cells.join(' ')).replace(/"/g, '').trim();
      if (!desc) continue;
      let amount = 0;
      if (amountIdx >= 0 && cells[amountIdx]) {
        amount = parseFloat(cells[amountIdx].replace(/[$,]/g, ''));
      }
      if (creditIdx >= 0 && cells[creditIdx] && parseFloat(cells[creditIdx].replace(/[$,]/g, '')) > 0) {
        amount = parseFloat(cells[creditIdx].replace(/[$,]/g, ''));
      }
      if (isNaN(amount) || amount === 0) continue;
      const amountCents = Math.round(Math.abs(amount) * 100);
      const dateISO = dateIdx >= 0 && cells[dateIdx] ? parseDateToISO(cells[dateIdx]) : todayISO();
      result.push({
        title: desc.length > 80 ? desc.slice(0, 77) + '...' : desc,
        amountCents,
        category: inferCategory(desc),
        dateISO,
      });
    }
    return result;
  }

  return parseStatement(text);
}
