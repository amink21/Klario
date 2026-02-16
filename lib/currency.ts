const DEFAULT_CURRENCY = 'CAD';

/**
 * Format cents as currency (default CAD).
 */
export function formatCurrency(cents: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Format signed cents for display: "+$X.XX" for income (negative cents), "-$X.XX" for expense (positive cents).
 */
export function formatSignedCurrency(cents: number, currency: string = DEFAULT_CURRENCY): string {
  const abs = Math.abs(cents);
  const formatted = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs / 100);
  if (cents < 0) return `+${formatted}`;
  if (cents > 0) return `−${formatted}`;
  return formatted;
}
