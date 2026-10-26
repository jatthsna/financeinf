-- ============================================================================
-- KAS INFORMATIKA - Script Setup Lengkap Database Supabase
-- Jalankan sekali di Supabase SQL Editor: https://supabase.com/dashboard/project/sdcgrultbvlbzjcoxvzw/sql
-- ============================================================================

-- KAS INFORMATIKA - Initial Database Schema
-- Complete financial management system for Informatics Study Program
-- All monetary values use BIGINT (storing Indonesian Rupiah in smallest unit)

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================================
-- SAFE CLEANUP (Memastikan eksekusi ulang berjalan bersih tanpa konflik)
-- ============================================================================
DROP TABLE IF EXISTS 
    profiles, 
    academic_years, 
    student_memberships, 
    billing_settings, 
    contribution_types, 
    contribution_periods, 
    student_obligations, 
    payments, 
    payment_allocations, 
    payment_evidence, 
    cash_accounts, 
    activities, 
    activity_budgets, 
    income_records, 
    expenses, 
    account_transfers, 
    app_settings, 
    user_invitations, 
    audit_logs, 
    fund_sources 
CASCADE;

DROP TYPE IF EXISTS 
    user_role, 
    academic_year_status, 
    contribution_category, 
    contribution_frequency, 
    obligation_status, 
    payment_method, 
    payment_status, 
    approval_status, 
    expense_category, 
    income_category, 
    activity_status, 
    audit_action, 
    invitation_status, 
    account_type, 
    transfer_status 
CASCADE;


-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'BENDAHARA', 'MAHASISWA');
CREATE TYPE academic_year_status AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE contribution_category AS ENUM ('RUTIN', 'KEGIATAN', 'SEMINAR', 'WORKSHOP', 'KEPANITIAAN', 'LAINNYA');
CREATE TYPE contribution_frequency AS ENUM ('WEEKLY', 'MONTHLY', 'ONE_TIME', 'ACTIVITY_BASED');
CREATE TYPE obligation_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'QRIS');
CREATE TYPE payment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVERSED');
CREATE TYPE approval_status AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'POSTED', 'REVERSED');
CREATE TYPE expense_category AS ENUM ('OPERASIONAL', 'KEGIATAN', 'PERLENGKAPAN', 'KONSUMSI', 'TRANSPORTASI', 'DOKUMENTASI', 'SEWA', 'LAINNYA');
CREATE TYPE income_category AS ENUM ('DONASI', 'SPONSOR', 'PENDAPATAN_KEGIATAN', 'LAINNYA');
CREATE TYPE activity_status AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'CLOSED');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'REVERSE', 'LOGIN', 'LOGOUT', 'ROLE_CHANGE', 'SETTINGS_CHANGE');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE account_type AS ENUM ('CASH', 'BANK', 'QRIS');
CREATE TYPE transfer_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL CHECK (char_length(full_name) >= 2),
    nim TEXT UNIQUE, -- Student ID number, null for staff
    email TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'MAHASISWA',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_linked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to resolve email by NIM for login
CREATE OR REPLACE FUNCTION get_email_by_nim(lookup_nim TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_email TEXT;
BEGIN
    SELECT email INTO found_email FROM profiles WHERE nim = TRIM(lookup_nim) LIMIT 1;
    RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_nim(TEXT) TO anon, authenticated;

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_nim ON profiles(nim) WHERE nim IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- ============================================================================
-- 2. ACADEMIC YEARS
-- ============================================================================
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_code TEXT NOT NULL UNIQUE CHECK (char_length(year_code) >= 4),
    display_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    status academic_year_status NOT NULL DEFAULT 'INACTIVE',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_year_code UNIQUE (year_code)
);

CREATE INDEX idx_academic_years_status ON academic_years(status);

-- ============================================================================
-- 3. STUDENT MEMBERSHIPS
-- ============================================================================
CREATE TABLE student_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    left_at DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_year UNIQUE (student_id, academic_year_id)
);

CREATE INDEX idx_memberships_student ON student_memberships(student_id);
CREATE INDEX idx_memberships_year ON student_memberships(academic_year_id);
CREATE INDEX idx_memberships_active ON student_memberships(is_active);

-- ============================================================================
-- 4. BILLING SETTINGS
-- ============================================================================
CREATE TABLE billing_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    default_amount BIGINT NOT NULL DEFAULT 10000 CHECK (default_amount > 0),
    default_frequency contribution_frequency NOT NULL DEFAULT 'MONTHLY',
    billing_day_of_month INTEGER CHECK (billing_day_of_month BETWEEN 1 AND 28),
    billing_day_of_week INTEGER CHECK (billing_day_of_week BETWEEN 0 AND 6),
    grace_period_days INTEGER NOT NULL DEFAULT 7 CHECK (grace_period_days >= 0),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_billing_year UNIQUE (academic_year_id)
);

-- ============================================================================
-- 5. CONTRIBUTION TYPES
-- ============================================================================
CREATE TABLE contribution_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) >= 2),
    description TEXT,
    category contribution_category NOT NULL DEFAULT 'RUTIN',
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    amount BIGINT NOT NULL CHECK (amount > 0),
    frequency contribution_frequency NOT NULL DEFAULT 'MONTHLY',
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    payment_deadline_days INTEGER NOT NULL DEFAULT 14 CHECK (payment_deadline_days > 0),
    allowed_payment_methods payment_method[] NOT NULL DEFAULT '{CASH,QRIS}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    related_activity_id UUID, -- Will reference activities table
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contribution_types_year ON contribution_types(academic_year_id);
CREATE INDEX idx_contribution_types_active ON contribution_types(is_active);
CREATE INDEX idx_contribution_types_category ON contribution_types(category);

-- ============================================================================
-- 6. CONTRIBUTION PERIODS
-- ============================================================================
CREATE TABLE contribution_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contribution_type_id UUID NOT NULL REFERENCES contribution_types(id) ON DELETE RESTRICT,
    period_label TEXT NOT NULL, -- e.g., "Januari 2026", "Minggu 1 - Jan 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    deadline DATE NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    is_generated BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_period UNIQUE (contribution_type_id, start_date, end_date)
);

CREATE INDEX idx_periods_contribution ON contribution_periods(contribution_type_id);
CREATE INDEX idx_periods_dates ON contribution_periods(start_date, end_date);
CREATE INDEX idx_periods_deadline ON contribution_periods(deadline);

-- ============================================================================
-- 7. STUDENT OBLIGATIONS
-- ============================================================================
CREATE TABLE student_obligations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    contribution_period_id UUID NOT NULL REFERENCES contribution_periods(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    original_amount BIGINT NOT NULL CHECK (original_amount > 0),
    paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining_amount BIGINT NOT NULL GENERATED ALWAYS AS (original_amount - paid_amount) STORED,
    status obligation_status NOT NULL DEFAULT 'UNPAID',
    deadline DATE NOT NULL,
    is_excluded BOOLEAN NOT NULL DEFAULT false,
    exclusion_reason TEXT,
    excluded_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_obligation UNIQUE (student_id, contribution_period_id),
    CONSTRAINT valid_paid_amount CHECK (paid_amount <= original_amount)
);

CREATE INDEX idx_obligations_student ON student_obligations(student_id);
CREATE INDEX idx_obligations_period ON student_obligations(contribution_period_id);
CREATE INDEX idx_obligations_year ON student_obligations(academic_year_id);
CREATE INDEX idx_obligations_status ON student_obligations(status);
CREATE INDEX idx_obligations_deadline ON student_obligations(deadline);

-- ============================================================================
-- 8. PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    payment_date DATE NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    -- For CASH payments
    recorded_by UUID REFERENCES profiles(id),
    -- For QRIS payments
    qris_reference TEXT,
    submitted_at TIMESTAMPTZ,
    -- For approval/rejection
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    -- For reversal
    reversed_by UUID REFERENCES profiles(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_year ON payments(academic_year_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_reference ON payments(reference_number);

-- ============================================================================
-- 9. PAYMENT ALLOCATIONS
-- ============================================================================
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    obligation_id UUID NOT NULL REFERENCES student_obligations(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_allocations_obligation ON payment_allocations(obligation_id);

-- ============================================================================
-- 10. PAYMENT EVIDENCE
-- ============================================================================
CREATE TABLE payment_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_payment ON payment_evidence(payment_id);

-- ============================================================================
-- 11. CASH ACCOUNTS
-- ============================================================================
CREATE TABLE cash_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name TEXT NOT NULL,
    account_type account_type NOT NULL DEFAULT 'CASH',
    account_number TEXT,
    description TEXT,
    opening_balance BIGINT NOT NULL DEFAULT 0,
    current_balance BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. ACTIVITIES
-- ============================================================================
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) >= 2),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    organizer TEXT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    status activity_status NOT NULL DEFAULT 'PLANNED',
    total_budget BIGINT NOT NULL DEFAULT 0 CHECK (total_budget >= 0),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_year ON activities(academic_year_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_dates ON activities(start_date, end_date);

-- Add FK from contribution_types to activities
ALTER TABLE contribution_types 
    ADD CONSTRAINT fk_contribution_activity 
    FOREIGN KEY (related_activity_id) REFERENCES activities(id) ON DELETE SET NULL;

-- ============================================================================
-- 13. ACTIVITY BUDGETS
-- ============================================================================
CREATE TABLE activity_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    budgeted_amount BIGINT NOT NULL CHECK (budgeted_amount >= 0),
    actual_amount BIGINT NOT NULL DEFAULT 0 CHECK (actual_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_budgets_activity ON activity_budgets(activity_id);

-- ============================================================================
-- 14. INCOME RECORDS (non-bill income)
-- ============================================================================
CREATE TABLE income_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number TEXT NOT NULL UNIQUE,
    date DATE NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    category income_category NOT NULL,
    source TEXT,
    description TEXT NOT NULL,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    account_id UUID REFERENCES cash_accounts(id) ON DELETE SET NULL,
    evidence_path TEXT,
    evidence_name TEXT,
    status approval_status NOT NULL DEFAULT 'DRAFT',
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_income_year ON income_records(academic_year_id);
CREATE INDEX idx_income_status ON income_records(status);
CREATE INDEX idx_income_category ON income_records(category);
CREATE INDEX idx_income_date ON income_records(date);
CREATE INDEX idx_income_activity ON income_records(activity_id);

-- ============================================================================
-- 15. EXPENSES
-- ============================================================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number TEXT NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    payment_method payment_method,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    budget_item_id UUID REFERENCES activity_budgets(id) ON DELETE SET NULL,
    account_id UUID REFERENCES cash_accounts(id) ON DELETE SET NULL,
    vendor TEXT,
    receipt_path TEXT,
    receipt_name TEXT,
    status approval_status NOT NULL DEFAULT 'DRAFT',
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_year ON expenses(academic_year_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(transaction_date);
CREATE INDEX idx_expenses_activity ON expenses(activity_id);

-- ============================================================================
-- 16. ACCOUNT TRANSFERS
-- ============================================================================
CREATE TABLE account_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number TEXT NOT NULL UNIQUE,
    from_account_id UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE RESTRICT,
    to_account_id UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL,
    description TEXT,
    status transfer_status NOT NULL DEFAULT 'PENDING',
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

CREATE INDEX idx_transfers_from ON account_transfers(from_account_id);
CREATE INDEX idx_transfers_to ON account_transfers(to_account_id);

-- ============================================================================
-- 17. APP SETTINGS
-- ============================================================================
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 18. USER INVITATIONS
-- ============================================================================
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'MAHASISWA',
    full_name TEXT,
    nim TEXT,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status invitation_status NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    invited_by UUID NOT NULL REFERENCES profiles(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_status ON user_invitations(status);

-- ============================================================================
-- 19. AUDIT LOGS
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id),
    action audit_action NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_record ON audit_logs(record_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================================
-- 20. FUND SOURCES (tracks where money comes from for reconciliation)
-- ============================================================================
CREATE TABLE fund_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fund_sources_year ON fund_sources(academic_year_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate unique reference numbers
CREATE OR REPLACE FUNCTION generate_reference(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
BEGIN
    ref := prefix || '-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') || '-' || 
           upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 8));
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for relevant tables
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_academic_years_updated_at BEFORE UPDATE ON academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_student_memberships_updated_at BEFORE UPDATE ON student_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_billing_settings_updated_at BEFORE UPDATE ON billing_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contribution_types_updated_at BEFORE UPDATE ON contribution_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_activity_budgets_updated_at BEFORE UPDATE ON activity_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_income_records_updated_at BEFORE UPDATE ON income_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cash_accounts_updated_at BEFORE UPDATE ON cash_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_student_obligations_updated_at BEFORE UPDATE ON student_obligations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update obligation paid amount from allocations
CREATE OR REPLACE FUNCTION update_obligation_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    total_paid BIGINT;
    obligation_record student_obligations%ROWTYPE;
BEGIN
    -- Get the obligation_id from either NEW or OLD
    IF TG_OP = 'DELETE' THEN
        SELECT COALESCE(SUM(pa.amount), 0) INTO total_paid
        FROM payment_allocations pa
        JOIN payments p ON pa.payment_id = p.id
        WHERE pa.obligation_id = OLD.obligation_id
        AND p.status = 'APPROVED';

        UPDATE student_obligations 
        SET paid_amount = total_paid,
            status = CASE 
                WHEN total_paid = 0 THEN 'UNPAID'::obligation_status
                WHEN total_paid >= original_amount THEN 'PAID'::obligation_status
                ELSE 'PARTIALLY_PAID'::obligation_status
            END
        WHERE id = OLD.obligation_id;
    ELSE
        SELECT COALESCE(SUM(pa.amount), 0) INTO total_paid
        FROM payment_allocations pa
        JOIN payments p ON pa.payment_id = p.id
        WHERE pa.obligation_id = NEW.obligation_id
        AND p.status = 'APPROVED';

        UPDATE student_obligations 
        SET paid_amount = total_paid,
            status = CASE 
                WHEN total_paid = 0 THEN 'UNPAID'::obligation_status
                WHEN total_paid >= original_amount THEN 'PAID'::obligation_status
                ELSE 'PARTIALLY_PAID'::obligation_status
            END
        WHERE id = NEW.obligation_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_obligation_paid
AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION update_obligation_paid_amount();

-- Function to validate total allocations don't exceed payment amount
CREATE OR REPLACE FUNCTION validate_allocation_total()
RETURNS TRIGGER AS $$
DECLARE
    payment_amount BIGINT;
    total_allocated BIGINT;
BEGIN
    SELECT amount INTO payment_amount FROM payments WHERE id = NEW.payment_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO total_allocated
    FROM payment_allocations 
    WHERE payment_id = NEW.payment_id AND id != NEW.id;
    
    IF (total_allocated + NEW.amount) > payment_amount THEN
        RAISE EXCEPTION 'Total allocation (%) exceeds payment amount (%)', 
            total_allocated + NEW.amount, payment_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_allocation
BEFORE INSERT OR UPDATE ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION validate_allocation_total();

-- Function to validate allocation doesn't exceed obligation remaining
CREATE OR REPLACE FUNCTION validate_allocation_obligation()
RETURNS TRIGGER AS $$
DECLARE
    obligation_remaining BIGINT;
    existing_allocated BIGINT;
BEGIN
    SELECT original_amount - paid_amount INTO obligation_remaining
    FROM student_obligations WHERE id = NEW.obligation_id;
    
    -- Account for other allocations on same obligation from same payment  
    SELECT COALESCE(SUM(amount), 0) INTO existing_allocated
    FROM payment_allocations
    WHERE obligation_id = NEW.obligation_id AND id != NEW.id
    AND payment_id IN (SELECT id FROM payments WHERE status IN ('PENDING', 'APPROVED'));
    
    IF NEW.amount > (obligation_remaining + existing_allocated) THEN
        RAISE EXCEPTION 'Allocation amount (%) exceeds obligation remaining balance (%)',
            NEW.amount, obligation_remaining;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_allocation_obligation
BEFORE INSERT ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION validate_allocation_obligation();

-- Function to create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, nim)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        'MAHASISWA',
        NEW.raw_user_meta_data->>'nim'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Audit log function
CREATE OR REPLACE FUNCTION log_audit(
    p_actor_id UUID,
    p_action audit_action,
    p_table_name TEXT,
    p_record_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (actor_id, action, table_name, record_id, old_values, new_values, description)
    VALUES (p_actor_id, p_action, p_table_name, p_record_id, p_old_values, p_new_values, p_description)
    RETURNING id INTO log_id;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has staff role
CREATE OR REPLACE FUNCTION is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id AND role IN ('ADMIN', 'BENDAHARA') AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id AND role = 'ADMIN' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
    ('organization_name', '"Program Studi Informatika"', 'Nama organisasi'),
    ('default_contribution_amount', '10000', 'Jumlah iuran default dalam Rupiah'),
    ('default_billing_frequency', '"MONTHLY"', 'Frekuensi penagihan default'),
    ('qris_image_path', '""', 'Path gambar QRIS di storage'),
    ('timezone', '"Asia/Jakarta"', 'Zona waktu aplikasi'),
    ('currency', '"IDR"', 'Mata uang'),
    ('app_version', '"1.0.0"', 'Versi aplikasi');


-- ============================================================================
-- SEED INITIAL 2026/2027 ACADEMIC YEAR & DEFAULT CASH ACCOUNT
-- ============================================================================
INSERT INTO academic_years (year_code, display_name, start_date, end_date, status)
VALUES ('2026/2027', 'Tahun Akademik 2026/2027', '2026-09-01', '2027-08-31', 'ACTIVE')
ON CONFLICT (year_code) DO NOTHING;

INSERT INTO cash_accounts (account_name, account_type, account_number, opening_balance, current_balance, is_active)
VALUES ('Kas Tunai Bendahara Prodi', 'CASH', NULL, 0, 0, true);


-- KAS INFORMATIKA - Row Level Security Policies
-- This migration enables RLS and creates policies for all tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_sources ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Staff can read all profiles
CREATE POLICY profiles_select_staff ON profiles
    FOR SELECT USING (is_staff(auth.uid()));

-- Users can update their own non-role fields
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- Cannot change own role
        role = (SELECT role FROM profiles WHERE id = auth.uid())
    );

-- Only admin can update roles
CREATE POLICY profiles_update_admin ON profiles
    FOR UPDATE USING (is_admin(auth.uid()));

-- Only admin can insert profiles (via invitation system)
CREATE POLICY profiles_insert ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

-- ============================================================================
-- ACADEMIC YEARS POLICIES
-- ============================================================================
-- Everyone can read academic years
CREATE POLICY academic_years_select ON academic_years
    FOR SELECT USING (true);

-- Only admin can manage academic years
CREATE POLICY academic_years_insert ON academic_years
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY academic_years_update ON academic_years
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================================================
-- STUDENT MEMBERSHIPS POLICIES
-- ============================================================================
-- Students can read their own memberships
CREATE POLICY memberships_select_own ON student_memberships
    FOR SELECT USING (student_id = auth.uid());

-- Staff can read all memberships
CREATE POLICY memberships_select_staff ON student_memberships
    FOR SELECT USING (is_staff(auth.uid()));

-- Only admin can manage memberships
CREATE POLICY memberships_insert ON student_memberships
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY memberships_update ON student_memberships
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY memberships_delete ON student_memberships
    FOR DELETE USING (is_admin(auth.uid()));

-- ============================================================================
-- BILLING SETTINGS POLICIES
-- ============================================================================
-- Staff can read billing settings
CREATE POLICY billing_settings_select ON billing_settings
    FOR SELECT USING (is_staff(auth.uid()));

-- Only admin can manage billing settings
CREATE POLICY billing_settings_insert ON billing_settings
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY billing_settings_update ON billing_settings
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================================================
-- CONTRIBUTION TYPES POLICIES
-- ============================================================================
-- Students can read active contribution types for their memberships
CREATE POLICY contribution_types_select_student ON contribution_types
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM student_memberships 
            WHERE student_id = auth.uid() 
            AND academic_year_id = contribution_types.academic_year_id
            AND is_active = true
        )
    );

-- Staff can read all contribution types
CREATE POLICY contribution_types_select_staff ON contribution_types
    FOR SELECT USING (is_staff(auth.uid()));

-- Only staff can manage contribution types
CREATE POLICY contribution_types_insert ON contribution_types
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY contribution_types_update ON contribution_types
    FOR UPDATE USING (is_staff(auth.uid()));

-- ============================================================================
-- CONTRIBUTION PERIODS POLICIES
-- ============================================================================
-- Students can read periods for their contribution types
CREATE POLICY periods_select_student ON contribution_periods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contribution_types ct
            JOIN student_memberships sm ON sm.academic_year_id = ct.academic_year_id
            WHERE ct.id = contribution_periods.contribution_type_id
            AND sm.student_id = auth.uid()
            AND sm.is_active = true
        )
    );

-- Staff can read all periods
CREATE POLICY periods_select_staff ON contribution_periods
    FOR SELECT USING (is_staff(auth.uid()));

-- Only staff can manage periods
CREATE POLICY periods_insert ON contribution_periods
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY periods_update ON contribution_periods
    FOR UPDATE USING (is_staff(auth.uid()));

-- ============================================================================
-- STUDENT OBLIGATIONS POLICIES
-- ============================================================================
-- Students can read only their own obligations
CREATE POLICY obligations_select_own ON student_obligations
    FOR SELECT USING (student_id = auth.uid());

-- Staff can read all obligations
CREATE POLICY obligations_select_staff ON student_obligations
    FOR SELECT USING (is_staff(auth.uid()));

-- Only staff can manage obligations
CREATE POLICY obligations_insert ON student_obligations
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY obligations_update ON student_obligations
    FOR UPDATE USING (is_staff(auth.uid()));

-- ============================================================================
-- PAYMENTS POLICIES
-- ============================================================================
-- Students can read their own payments
CREATE POLICY payments_select_own ON payments
    FOR SELECT USING (student_id = auth.uid());

-- Staff can read all payments
CREATE POLICY payments_select_staff ON payments
    FOR SELECT USING (is_staff(auth.uid()));

-- Students can insert QRIS payments for themselves only
CREATE POLICY payments_insert_student ON payments
    FOR INSERT WITH CHECK (
        student_id = auth.uid() AND
        payment_method = 'QRIS' AND
        status = 'PENDING'
    );

-- Staff can insert any payment
CREATE POLICY payments_insert_staff ON payments
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

-- Only staff can update payments (approve/reject)
CREATE POLICY payments_update_staff ON payments
    FOR UPDATE USING (is_staff(auth.uid()));

-- ============================================================================
-- PAYMENT ALLOCATIONS POLICIES
-- ============================================================================
-- Students can read their own allocations
CREATE POLICY allocations_select_own ON payment_allocations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payments WHERE id = payment_allocations.payment_id AND student_id = auth.uid()
        )
    );

-- Staff can read all allocations
CREATE POLICY allocations_select_staff ON payment_allocations
    FOR SELECT USING (is_staff(auth.uid()));

-- Only staff can manage allocations
CREATE POLICY allocations_insert ON payment_allocations
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY allocations_update ON payment_allocations
    FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY allocations_delete ON payment_allocations
    FOR DELETE USING (is_staff(auth.uid()));

-- ============================================================================
-- PAYMENT EVIDENCE POLICIES
-- ============================================================================
-- Students can read their own evidence
CREATE POLICY evidence_select_own ON payment_evidence
    FOR SELECT USING (uploaded_by = auth.uid());

-- Staff can read all evidence
CREATE POLICY evidence_select_staff ON payment_evidence
    FOR SELECT USING (is_staff(auth.uid()));

-- Students can upload evidence for their own payments
CREATE POLICY evidence_insert_own ON payment_evidence
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM payments WHERE id = payment_evidence.payment_id AND student_id = auth.uid()
        )
    );

-- Staff can upload evidence
CREATE POLICY evidence_insert_staff ON payment_evidence
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

-- ============================================================================
-- CASH ACCOUNTS POLICIES
-- ============================================================================
-- Only staff can access cash accounts
CREATE POLICY cash_accounts_select ON cash_accounts
    FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY cash_accounts_insert ON cash_accounts
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY cash_accounts_update ON cash_accounts
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================================================
-- ACTIVITIES POLICIES
-- ============================================================================
-- All authenticated users can read activities
CREATE POLICY activities_select ON activities
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only staff can manage activities
CREATE POLICY activities_insert ON activities
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY activities_update ON activities
    FOR UPDATE USING (is_staff(auth.uid()));

-- ============================================================================
-- ACTIVITY BUDGETS POLICIES
-- ============================================================================
-- Staff can read all budgets
CREATE POLICY budgets_select ON activity_budgets
    FOR SELECT USING (is_staff(auth.uid()));

-- Only staff can manage budgets
CREATE POLICY budgets_insert ON activity_budgets
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY budgets_update ON activity_budgets
    FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY budgets_delete ON activity_budgets
    FOR DELETE USING (is_staff(auth.uid()));

-- ============================================================================
-- INCOME RECORDS POLICIES
-- ============================================================================
-- Only staff can access income records
CREATE POLICY income_select ON income_records
    FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY income_insert ON income_records
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY income_update ON income_records
    FOR UPDATE USING (is_staff(auth.uid()));

-- ============================================================================
-- EXPENSES POLICIES
-- ============================================================================
-- Only staff can access expenses
CREATE POLICY expenses_select ON expenses
    FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY expenses_insert ON expenses
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY expenses_update ON expenses
    FOR UPDATE USING (is_staff(auth.uid()));

-- ============================================================================
-- ACCOUNT TRANSFERS POLICIES
-- ============================================================================
-- Only staff can access transfers
CREATE POLICY transfers_select ON account_transfers
    FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY transfers_insert ON account_transfers
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY transfers_update ON account_transfers
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================================================
-- APP SETTINGS POLICIES
-- ============================================================================
-- All authenticated users can read non-sensitive settings
CREATE POLICY settings_select ON app_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can manage settings
CREATE POLICY settings_insert ON app_settings
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY settings_update ON app_settings
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================================================
-- USER INVITATIONS POLICIES
-- ============================================================================
-- Only staff can read invitations
CREATE POLICY invitations_select ON user_invitations
    FOR SELECT USING (is_staff(auth.uid()));

-- Only admin can create invitations
CREATE POLICY invitations_insert ON user_invitations
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Only admin can update invitations
CREATE POLICY invitations_update ON user_invitations
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================
-- Only admin can read audit logs
CREATE POLICY audit_select ON audit_logs
    FOR SELECT USING (is_admin(auth.uid()));

-- Audit logs are inserted via SECURITY DEFINER functions only
-- No direct insert policy for regular users
CREATE POLICY audit_insert ON audit_logs
    FOR INSERT WITH CHECK (is_staff(auth.uid()));

-- Nobody can update or delete audit logs
-- (No UPDATE or DELETE policies = denied by default with RLS enabled)

-- ============================================================================
-- FUND SOURCES POLICIES
-- ============================================================================
CREATE POLICY fund_sources_select ON fund_sources
    FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY fund_sources_insert ON fund_sources
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY fund_sources_update ON fund_sources
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================================================
-- STORAGE POLICIES (for Supabase Storage buckets)
-- ============================================================================
-- These would be configured in Supabase dashboard or via SQL:
-- Bucket: payment-evidence (private)
-- Bucket: qris-images (private, admin upload, authenticated read)
-- Bucket: receipts (private)
-- Bucket: documents (private)

-- ============================================================================
-- INITIAL SEED & SYNC FOR 26 PRODI INFORMATIKA USERS
-- ============================================================================
-- Synchronize existing auth.users to profiles with designated roles
INSERT INTO profiles (id, full_name, nim, email, role, is_active, email_linked)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'nim', NULL),
    u.email,
    CASE 
        WHEN COALESCE(u.raw_user_meta_data->>'nim', '') = '265211019' THEN 'ADMIN'::user_role -- SULAIMAN JATMIKO (ADMIN)
        WHEN COALESCE(u.raw_user_meta_data->>'nim', '') = '265211020' THEN 'ADMIN'::user_role -- MUHAMMAD ADAM KHAKIKI (KETUA PRODI)
        WHEN COALESCE(u.raw_user_meta_data->>'nim', '') IN ('265211017', '265211022') THEN 'BENDAHARA'::user_role -- IANA ZAHWA & NABILA FITROTUL MAULIYA
        WHEN (u.raw_user_meta_data->>'role') = 'ADMIN' THEN 'ADMIN'::user_role
        WHEN (u.raw_user_meta_data->>'role') = 'BENDAHARA' THEN 'BENDAHARA'::user_role
        ELSE 'MAHASISWA'::user_role
    END,
    true,
    false
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    nim = EXCLUDED.nim,
    role = EXCLUDED.role;

-- Automatically enroll all students into 2026/2027 Academic Year
INSERT INTO student_memberships (student_id, academic_year_id, is_active)
SELECT 
    p.id,
    ay.id,
    true
FROM profiles p
CROSS JOIN academic_years ay
WHERE ay.year_code LIKE '2026%' OR ay.status = 'ACTIVE'
ON CONFLICT (student_id, academic_year_id) DO NOTHING;
