/**
 * Logo.dev: use domain when we know it (correct logo), else name (can be wrong).
 * - Domain: https://img.logo.dev/{domain}?token=...
 * - Name:   https://img.logo.dev/name/{name}?token=...
 */

const LOGO_DEV_TOKEN =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LOGO_DEV_TOKEN) ||
  'pk_coV-IgbGTmyw6G5i7oyfKA';

/**
 * Curated map: merchant name fragment → domain. Use when name-based lookup returns wrong logo.
 * Longer keys first so "petro canada" matches before "petro".
 */
export const merchantDomainMap: Record<string, string> = {
  'petro canada': 'petrocanada.com',
  petrocanada: 'petrocanada.com',
  'no frills': 'nofrills.ca',
  nofrills: 'nofrills.ca',
  'tim hortons': 'timhortons.com',
  timhortons: 'timhortons.com',
  'best buy': 'bestbuy.com',
  bestbuy: 'bestbuy.com',
  'whole foods': 'wholefoodsmarket.com',
  'trader joe': 'traderjoes.com',
  'american express': 'americanexpress.com',
  'pizza hut': 'pizzahut.com',
  "domino's": 'dominos.com',
  'disney+': 'disneyplus.com',
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  amazon: 'amazon.com',
  apple: 'apple.com',
  google: 'google.com',
  microsoft: 'microsoft.com',
  tesla: 'tesla.com',
  uber: 'uber.com',
  walmart: 'walmart.com',
  costco: 'costco.com',
  starbucks: 'starbucks.com',
  mcdonalds: 'mcdonalds.com',
  mcdonald: 'mcdonalds.com',
  cursor: 'cursor.com',
  keurig: 'keurig.com',
  adobe: 'adobe.com',
  slack: 'slack.com',
  zoom: 'zoom.us',
  shell: 'shell.com',
  esso: 'esso.com',
  rogers: 'rogers.com',
  bell: 'bell.ca',
  telus: 'telus.com',
  td: 'td.com',
  rbc: 'rbc.com',
  bmo: 'bmo.com',
  scotiabank: 'scotiabank.com',
  cibc: 'cibc.com',
  paypal: 'paypal.com',
  disney: 'disneyplus.com',
};

/** Sorted by key length desc so "petro canada" is checked before "petro". */
const domainMapEntries = Object.entries(merchantDomainMap).sort(
  (a, b) => b[0].length - a[0].length
);

/**
 * Returns known domain for merchant name (lowercase includes), or null.
 */
export function getMerchantDomain(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  const lower = name.toLowerCase().trim();
  for (const [key, domain] of domainMapEntries) {
    if (lower.includes(key)) return domain;
  }
  return null;
}

/**
 * Cleans merchant name: trim and strip trailing amount (e.g. "Netflix $15" → "Netflix").
 */
export function cleanMerchantNameForLogo(name: string): string {
  if (!name || typeof name !== 'string') return '';
  let s = name.trim();
  s = s.replace(/\s*[-–]?\s*\$\d+(\.\d{2})?\s*$/i, '').trim();
  return s || name.trim();
}

/**
 * Logo.dev URL by domain (accurate when we have a known domain).
 */
export function getLogoDevUrlByDomain(domain: string): string {
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}`;
}

/**
 * Logo.dev URL by company name (Brand Search; use when no domain in map).
 */
export function getLogoDevUrlByName(name: string): string {
  const cleaned = cleanMerchantNameForLogo(name);
  const encoded = encodeURIComponent(cleaned);
  return `https://img.logo.dev/name/${encoded}?token=${LOGO_DEV_TOKEN}`;
}

/**
 * Best logo URL: use domain when known (correct logo), otherwise name lookup.
 */
export function getLogoDevUrl(merchantName: string): string {
  const domain = getMerchantDomain(merchantName);
  return domain ? getLogoDevUrlByDomain(domain) : getLogoDevUrlByName(merchantName);
}

/**
 * Category → emoji for fallback when logo fails or name is empty.
 */
const categoryEmojiMap: Record<string, string> = {
  food: '🍔',
  coffee: '☕',
  groceries: '🛒',
  grocery: '🛒',
  transport: '🚗',
  transportation: '🚗',
  bills: '📺',
  subscriptions: '📺',
  subscription: '📺',
  entertainment: '📺',
  dining: '🍴',
  pizza: '🍕',
  restaurant: '🍴',
};

/**
 * Returns emoji for a category string, or null if no match.
 */
export function getCategoryEmoji(category: string): string | null {
  if (!category || typeof category !== 'string') return null;
  const lower = category.toLowerCase().trim();
  return categoryEmojiMap[lower] ?? null;
}
