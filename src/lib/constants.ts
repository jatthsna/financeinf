// ========================================
// KAS INFORMATIKA - Application Constants
// ========================================

/** Application metadata */
export const APP_NAME = 'KAS INFORMATIKA' as const
export const APP_DESCRIPTION = 'Sistem Manajemen Keuangan Kelas Informatika' as const
export const APP_VERSION = '1.0.0' as const

/** Locale & Currency */
export const LOCALE = 'id-ID' as const
export const TIMEZONE = 'Asia/Jakarta' as const
export const CURRENCY = 'IDR' as const
export const CURRENCY_SYMBOL = 'Rp' as const

/** User Roles */
export const ROLES = {
  ADMIN: 'admin',
  TREASURER: 'treasurer',
  MEMBER: 'member',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/** Role display labels (Indonesian) */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.TREASURER]: 'Bendahara',
  [ROLES.MEMBER]: 'Anggota',
} as const

/** Transaction Types */
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES]

/** Transaction Type Labels (Indonesian) */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TRANSACTION_TYPES.INCOME]: 'Pemasukan',
  [TRANSACTION_TYPES.EXPENSE]: 'Pengeluaran',
} as const

/** Payment Statuses */
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]

/** Payment Status Labels (Indonesian) */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUSES.PENDING]: 'Menunggu',
  [PAYMENT_STATUSES.PAID]: 'Lunas',
  [PAYMENT_STATUSES.OVERDUE]: 'Terlambat',
  [PAYMENT_STATUSES.CANCELLED]: 'Dibatalkan',
} as const

/** Payment Status Colors (Tailwind classes) */
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUSES.PENDING]: 'bg-amber-100 text-amber-800',
  [PAYMENT_STATUSES.PAID]: 'bg-green-100 text-green-800',
  [PAYMENT_STATUSES.OVERDUE]: 'bg-red-100 text-red-800',
  [PAYMENT_STATUSES.CANCELLED]: 'bg-gray-100 text-gray-600',
} as const

/** Expense Categories */
export const EXPENSE_CATEGORIES = {
  EVENT: 'event',
  SUPPLIES: 'supplies',
  FOOD: 'food',
  DONATION: 'donation',
  OTHER: 'other',
} as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[keyof typeof EXPENSE_CATEGORIES]

/** Expense Category Labels (Indonesian) */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [EXPENSE_CATEGORIES.EVENT]: 'Acara',
  [EXPENSE_CATEGORIES.SUPPLIES]: 'Perlengkapan',
  [EXPENSE_CATEGORIES.FOOD]: 'Konsumsi',
  [EXPENSE_CATEGORIES.DONATION]: 'Donasi',
  [EXPENSE_CATEGORIES.OTHER]: 'Lainnya',
} as const

/** Pagination */
export const DEFAULT_PAGE_SIZE = 10 as const
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

/** Date format patterns */
export const DATE_FORMATS = {
  SHORT: 'dd/MM/yyyy',
  LONG: 'dd MMMM yyyy',
  WITH_TIME: 'dd/MM/yyyy HH:mm',
  MONTH_YEAR: 'MMMM yyyy',
  ISO: 'yyyy-MM-dd',
} as const

/** Indonesian month names */
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const

/** Indonesian day names */
export const DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
] as const
