/**
 * Format number as Indonesian Rupiah currency
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date as ISO string
 */
export function getTodayISO(): string {
  return toISODateString(new Date());
}

/**
 * Parse Indonesian currency input to number
 */
export function parseRupiahInput(value: string): number {
  // Remove all non-numeric characters except decimal
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned) || 0;
}
