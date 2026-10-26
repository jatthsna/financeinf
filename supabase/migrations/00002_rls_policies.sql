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

-- Note: Storage policies are managed through Supabase Storage API
-- and configured separately. See README for setup instructions.
