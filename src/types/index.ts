// ========================================
// KAS INFORMATIKA - Type Definitions
// ========================================

export type UserRole = 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';

export interface Profile {
  id: string;
  full_name: string;
  nim: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  email_linked?: boolean;
  created_at: string;
  updated_at: string;
}

export type AcademicYearStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface AcademicYear {
  id: string;
  year_code: string;
  display_name: string;
  name?: string;
  start_date: string;
  end_date: string;
  status: AcademicYearStatus;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ContributionType {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  academic_year_id: string;
  is_mandatory: boolean;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BillingStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Billing {
  id: string;
  user_id: string;
  contribution_type_id: string;
  academic_year_id: string;
  amount: number;
  amount_paid: number;
  status: BillingStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  profile?: Profile;
  contribution_type?: ContributionType;
}

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'EWALLET';

export interface Payment {
  id: string;
  billing_id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  proof_url: string | null;
  status: PaymentStatus;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  billing?: Billing;
  profile?: Profile;
  verifier?: Profile;
}

export interface Income {
  id: string;
  academic_year_id: string;
  description: string;
  amount: number;
  source: string;
  date: string;
  receipt_url: string | null;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  academic_year_id: string;
  activity_id: string | null;
  account_id: string | null;
  description: string;
  amount: number;
  date: string;
  receipt_url: string | null;
  recorded_by: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  activity?: Activity;
  account?: Account;
}

export interface Activity {
  id: string;
  academic_year_id: string;
  name: string;
  description: string | null;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'EWALLET';
  account_number: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  // Relations
  profile?: Profile;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface ContributionPeriod {
  id: string;
  contribution_type_id: string;
  name: string;
  due_date: string;
  academic_year_id: string;
  created_at: string;
  updated_at: string;
  // Relations
  contribution_type?: ContributionType;
}

export interface Obligation {
  id: string;
  user_id: string;
  contribution_type_id: string;
  contribution_period_id: string | null;
  academic_year_id: string;
  amount: number;
  amount_paid: number;
  status: BillingStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  profile?: Profile;
  contribution_type?: ContributionType;
  contribution_period?: ContributionPeriod;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  billing_id: string;
  amount: number;
  created_at: string;
  // Relations
  billing?: Billing;
}

export interface BudgetItem {
  id: string;
  activity_id: string;
  description: string;
  estimated_amount: number;
  actual_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountTransaction {
  id: string;
  account_id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  date: string;
  created_at: string;
  // Relations
  account?: Account;
}

export interface StudentMembership {
  id: string;
  user_id: string;
  academic_year_id: string;
  joined_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  profile?: Profile;
  academic_year?: AcademicYear;
}

// ========================================
// Filter Types
// ========================================

export interface ObligationFilters {
  academicYearId?: string;
  studentId?: string;
  status?: BillingStatus;
  periodId?: string;
  contributionTypeId?: string;
}

export interface PaymentFilters {
  academicYearId?: string;
  studentId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

export interface IncomeFilters {
  academicYearId?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseFilters {
  academicYearId?: string;
  activityId?: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportFilters {
  academicYearId?: string;
  dateFrom?: string;
  dateTo?: string;
  month?: number;
  year?: number;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
}
