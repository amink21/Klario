/**
 * Deterministic category classifier from keywords.
 * NO AI. Keyword-to-category mapping.
 */

export type Category =
  | 'Food' | 'Transport' | 'Subscriptions' | 'Insurance'
  | 'Health' | 'Utilities' | 'Housing' | 'Entertainment' | 'Other';

type CategoryKeywords = Record<Category, string[]>;

const CATEGORY_MAP: CategoryKeywords = {
  Food: ['coffee', 'lunch', 'dinner', 'meal', 'restaurant', 'groceries', 'food', 'uber eats', 'doordash'],
  Transport: ['uber', 'lyft', 'gas', 'parking', 'transport', 'car', 'bus', 'train', 'transit'],
  Subscriptions: ['netflix', 'spotify', 'subscription', 'membership', 'gym', 'plan'],
  Insurance: ['insurance', 'car insurance', 'premium', 'policy'],
  Health: ['dentist', 'pharmacy', 'meds', 'doctor', 'health'],
  Utilities: ['hydro', 'internet', 'phone', 'electricity', 'electric', 'water', 'utilities', 'utility'],
  Housing: ['rent', 'mortgage'],
  Entertainment: ['movie', 'games', 'entertainment'],
  Other: [],
};

/**
 * Classify category from text using keyword matching.
 * Checks longer phrases first (e.g. "car insurance" before "car").
 * Returns first matching category; default Other.
 */
export function classifyCategory(text: string): Category {
  const t = text.toLowerCase().trim();

  const entries = Object.entries(CATEGORY_MAP) as [Category, string[]][];
  const allPairs: [Category, string][] = [];
  for (const [category, keywords] of entries) {
    if (category === 'Other') continue;
    for (const kw of keywords) allPairs.push([category, kw]);
  }
  allPairs.sort((a, b) => b[1].length - a[1].length);

  for (const [category, kw] of allPairs) {
    if (t.includes(kw)) return category;
  }

  return 'Other';
}

/**
 * Optional: override category if title contains a known merchant.
 * Stub for future "user memory" / merchant mapping.
 */
export function classifyCategoryWithOverrides(
  text: string,
  merchantCategoryMap?: Record<string, Category>
): Category {
  if (merchantCategoryMap) {
    const t = text.toLowerCase();
    for (const [merchant, category] of Object.entries(merchantCategoryMap)) {
      if (t.includes(merchant.toLowerCase())) return category;
    }
  }
  return classifyCategory(text);
}
