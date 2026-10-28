import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CURRENCY, LOCALE, TIMEZONE, MONTH_NAMES } from './constants'

/**
 * Merge Tailwind CSS classes with clsx.
 * Handles conditional classes and resolves conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Indonesian Rupiah currency.
 *
 * @param amount - The numeric amount to format
 * @param options - Optional Intl.NumberFormatOptions overrides
 * @returns Formatted currency string (e.g., "Rp 150.000")
 *
 * @example
 * formatCurrency(150000) // "Rp 150.000"
 * formatCurrency(1500000) // "Rp 1.500.000"
 * formatCurrency(0) // "Rp 0"
 */
export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount)
}

/**
 * Format a date string or Date object for Indonesian locale.
 *
 * @param date - Date string, Date object, or timestamp
 * @param options - Formatting style or Intl.DateTimeFormatOptions
 * @returns Formatted date string
 *
 * @example
 * formatDate('2024-03-15') // "15 Maret 2024"
 * formatDate('2024-03-15', 'short') // "15/03/2024"
 * formatDate('2024-03-15', 'with-time') // "15 Maret 2024, 00:00"
 */
export function formatDate(
  date: string | Date | number,
  options: 'short' | 'long' | 'with-time' | 'month-year' | Intl.DateTimeFormatOptions = 'long'
): string {
  const d = new Date(date)

  if (isNaN(d.getTime())) {
    return '-'
  }

  if (typeof options === 'object') {
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIMEZONE,
      ...options,
    }).format(d)
  }

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: TIMEZONE,
    },
    long: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: TIMEZONE,
    },
    'with-time': {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TIMEZONE,
    },
    'month-year': {
      month: 'long',
      year: 'numeric',
      timeZone: TIMEZONE,
    },
  }

  return new Intl.DateTimeFormat(LOCALE, formatOptions[options]).format(d)
}

/**
 * Generate a unique reference number for transactions.
 *
 * @param prefix - Prefix for the reference (default: 'KAS')
 * @returns Reference string (e.g., "KAS-20240315-A1B2C3")
 *
 * @example
 * generateReference() // "KAS-20240315-A1B2C3"
 * generateReference('TRX') // "TRX-20240315-X4Y5Z6"
 */
export function generateReference(prefix: string = 'KAS'): string {
  const now = new Date()
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')

  const randomStr = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()

  return `${prefix}-${dateStr}-${randomStr}`
}

/**
 * Get Indonesian month name from a month index (0-based).
 *
 * @param monthIndex - 0-based month index (0 = January)
 * @returns Indonesian month name
 */
export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] ?? ''
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

/**
 * Delay execution for a specified duration (useful for loading states).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Safely parse a JSON string, returning a default value on failure.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Create initials from a full name (max 2 characters).
 *
 * @example
 * getInitials('Ahmad Rizki') // 'AR'
 * getInitials('Budi') // 'BU'
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Convert numbers to Indonesian words (terbilang).
 * E.g., 25000 -> "Dua Puluh Lima Ribu Rupiah"
 */
export function terbilang(n: number): string {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function toWords(num: number): string {
    const n = Math.floor(Math.abs(num));
    if (n < 12) return bilangan[n];
    if (n < 20) return toWords(n - 10) + ' Belas';
    if (n < 100) return toWords(Math.floor(n / 10)) + ' Puluh' + (n % 10 !== 0 ? ' ' + toWords(n % 10) : '');
    if (n < 200) return 'Seratus' + (n % 100 !== 0 ? ' ' + toWords(n % 100) : '');
    if (n < 1000) return toWords(Math.floor(n / 100)) + ' Ratus' + (n % 100 !== 0 ? ' ' + toWords(n % 100) : '');
    if (n < 2000) return 'Seribu' + (n % 1000 !== 0 ? ' ' + toWords(n % 1000) : '');
    if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 !== 0 ? ' ' + toWords(n % 1000) : '');
    if (n < 1000000000) return toWords(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 !== 0 ? ' ' + toWords(n % 1000000) : '');
    if (n < 1000000000000) return toWords(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 !== 0 ? ' ' + toWords(n % 1000000000) : '');
    return toWords(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 !== 0 ? ' ' + toWords(n % 1000000000000) : '');
  }

  if (n === 0) return 'Nol Rupiah';
  return `${toWords(n).trim()} Rupiah`;
}

