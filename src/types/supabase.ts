// ============================================================================
// KAS INFORMATIKA — Supabase Database Type Definitions
// ============================================================================
// Auto-style type definitions for the `public` schema.
// Generated manually to match the PostgreSQL schema.
// Monetary values are stored as BIGINT → mapped to `number` in TypeScript.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          nim: string | null;
          email: string;
          phone: string | null;
          role: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          nim?: string | null;
          email: string;
          phone?: string | null;
          role?: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          nim?: string | null;
          email?: string;
          phone?: string | null;
          role?: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
          avatar_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      academic_years: {
        Row: {
          id: string;
          year_code: string;
          display_name: string;
          start_date: string;
          end_date: string;
          status: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'ARCHIVED';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year_code: string;
          display_name: string;
          start_date: string;
          end_date: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'ARCHIVED';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          year_code?: string;
          display_name?: string;
          start_date?: string;
          end_date?: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'ARCHIVED';
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'academic_years_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      student_memberships: {
        Row: {
          id: string;
          academic_year_id: string;
          student_id: string;
          status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED';
          joined_at: string;
          left_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          student_id: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED';
          joined_at?: string;
          left_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          student_id?: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED';
          joined_at?: string;
          left_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_memberships_academic_year_id_fkey';
            columns: ['academic_year_id'];
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_memberships_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      billing_settings: {
        Row: {
          id: string;
          academic_year_id: string;
          payment_deadline_day: number;
          grace_period_days: number;
          enable_penalties: boolean;
          penalty_amount: number;
          penalty_type: 'FIXED' | 'PERCENTAGE';
          reminder_days_before: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          payment_deadline_day?: number;
          grace_period_days?: number;
          enable_penalties?: boolean;
          penalty_amount?: number;
          penalty_type?: 'FIXED' | 'PERCENTAGE';
          reminder_days_before?: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          payment_deadline_day?: number;
          grace_period_days?: number;
          enable_penalties?: boolean;
          penalty_amount?: number;
          penalty_type?: 'FIXED' | 'PERCENTAGE';
          reminder_days_before?: number[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_settings_academic_year_id_fkey';
            columns: ['academic_year_id'];
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
        ];
      };

      contribution_types: {
        Row: {
          id: string;
          academic_year_id: string;
          name: string;
          description: string | null;
          category: 'RUTIN' | 'KEGIATAN' | 'SEMINAR' | 'WORKSHOP' | 'KEPANITIAAN' | 'LAINNYA';
          frequency: 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | 'ACTIVITY_BASED';
          default_amount: number;
          is_mandatory: boolean;
          activity_id: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          name: string;
          description?: string | null;
          category: 'RUTIN' | 'KEGIATAN' | 'SEMINAR' | 'WORKSHOP' | 'KEPANITIAAN' | 'LAINNYA';
          frequency: 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | 'ACTIVITY_BASED';
          default_amount: number;
          is_mandatory?: boolean;
          activity_id?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          name?: string;
          description?: string | null;
          category?: 'RUTIN' | 'KEGIATAN' | 'SEMINAR' | 'WORKSHOP' | 'KEPANITIAAN' | 'LAINNYA';
          frequency?: 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | 'ACTIVITY_BASED';
          default_amount?: number;
          is_mandatory?: boolean;
          activity_id?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contribution_types_academic_year_id_fkey';
            columns: ['academic_year_id'];
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_types_activity_id_fkey';
            columns: ['activity_id'];
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_types_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      contribution_periods: {
        Row: {
          id: string;
          contribution_type_id: string;
          period_name: string;
          start_date: string;
          end_date: string;
          due_date: string;
          amount: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contribution_type_id: string;
          period_name: string;
          start_date: string;
          end_date: string;
          due_date: string;
          amount: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          contribution_type_id?: string;
          period_name?: string;
          start_date?: string;
          end_date?: string;
          due_date?: string;
          amount?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contribution_periods_contribution_type_id_fkey';
            columns: ['contribution_type_id'];
            referencedRelation: 'contribution_types';
            referencedColumns: ['id'];
          },
        ];
      };

      student_obligations: {
        Row: {
          id: string;
          student_id: string;
          contribution_period_id: string;
          amount: number;
          paid_amount: number;
          remaining_amount: number;
          status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
          due_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          contribution_period_id: string;
          amount: number;
          paid_amount?: number;
          remaining_amount?: number;
          status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
          due_date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          contribution_period_id?: string;
          amount?: number;
          paid_amount?: number;
          remaining_amount?: number;
          status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
          due_date?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_obligations_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'student_obligations_contribution_period_id_fkey';
            columns: ['contribution_period_id'];
            referencedRelation: 'contribution_periods';
            referencedColumns: ['id'];
          },
        ];
      };

      payments: {
        Row: {
          id: string;
          payment_code: string;
          student_id: string;
          amount: number;
          payment_method: 'CASH' | 'QRIS';
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
          payment_date: string;
          notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          cash_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payment_code?: string;
          student_id: string;
          amount: number;
          payment_method: 'CASH' | 'QRIS';
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
          payment_date: string;
          notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          cash_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          payment_code?: string;
          student_id?: string;
          amount?: number;
          payment_method?: 'CASH' | 'QRIS';
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
          payment_date?: string;
          notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          cash_account_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_reviewed_by_fkey';
            columns: ['reviewed_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_cash_account_id_fkey';
            columns: ['cash_account_id'];
            referencedRelation: 'cash_accounts';
            referencedColumns: ['id'];
          },
        ];
      };

      payment_allocations: {
        Row: {
          id: string;
          payment_id: string;
          obligation_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          obligation_id: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          payment_id?: string;
          obligation_id?: string;
          amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_allocations_payment_id_fkey';
            columns: ['payment_id'];
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_allocations_obligation_id_fkey';
            columns: ['obligation_id'];
            referencedRelation: 'student_obligations';
            referencedColumns: ['id'];
          },
        ];
      };

      payment_evidence: {
        Row: {
          id: string;
          payment_id: string;
          file_url: string;
          file_name: string;
          file_type: string;
          file_size: number;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          file_url: string;
          file_name: string;
          file_type: string;
          file_size: number;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          payment_id?: string;
          file_url?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_evidence_payment_id_fkey';
            columns: ['payment_id'];
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_evidence_uploaded_by_fkey';
            columns: ['uploaded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      cash_accounts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          account_type: 'CASH' | 'BANK' | 'DIGITAL_WALLET';
          balance: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          account_type?: 'CASH' | 'BANK' | 'DIGITAL_WALLET';
          balance?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          account_type?: 'CASH' | 'BANK' | 'DIGITAL_WALLET';
          balance?: number;
          is_active?: boolean;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_accounts_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      fund_sources: {
        Row: {
          id: string;
          cash_account_id: string;
          source_type: 'CONTRIBUTION' | 'ACTIVITY_INCOME' | 'DONATION' | 'TRANSFER' | 'OTHER';
          reference_id: string | null;
          amount: number;
          description: string | null;
          recorded_at: string;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cash_account_id: string;
          source_type: 'CONTRIBUTION' | 'ACTIVITY_INCOME' | 'DONATION' | 'TRANSFER' | 'OTHER';
          reference_id?: string | null;
          amount: number;
          description?: string | null;
          recorded_at?: string;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          cash_account_id?: string;
          source_type?: 'CONTRIBUTION' | 'ACTIVITY_INCOME' | 'DONATION' | 'TRANSFER' | 'OTHER';
          reference_id?: string | null;
          amount?: number;
          description?: string | null;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fund_sources_cash_account_id_fkey';
            columns: ['cash_account_id'];
            referencedRelation: 'cash_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fund_sources_recorded_by_fkey';
            columns: ['recorded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      account_transfers: {
        Row: {
          id: string;
          transfer_type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTER_ACCOUNT';
          from_account_id: string | null;
          to_account_id: string | null;
          amount: number;
          description: string | null;
          reference_number: string | null;
          transferred_at: string;
          recorded_by: string | null;
          status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          transfer_type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTER_ACCOUNT';
          from_account_id?: string | null;
          to_account_id?: string | null;
          amount: number;
          description?: string | null;
          reference_number?: string | null;
          transferred_at: string;
          recorded_by?: string | null;
          status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          transfer_type?: 'DEPOSIT' | 'WITHDRAWAL' | 'INTER_ACCOUNT';
          from_account_id?: string | null;
          to_account_id?: string | null;
          amount?: number;
          description?: string | null;
          reference_number?: string | null;
          transferred_at?: string;
          recorded_by?: string | null;
          status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          approved_by?: string | null;
          approved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_transfers_from_account_id_fkey';
            columns: ['from_account_id'];
            referencedRelation: 'cash_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_transfers_to_account_id_fkey';
            columns: ['to_account_id'];
            referencedRelation: 'cash_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_transfers_recorded_by_fkey';
            columns: ['recorded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_transfers_approved_by_fkey';
            columns: ['approved_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      activities: {
        Row: {
          id: string;
          academic_year_id: string;
          name: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
          total_budget: number;
          total_spent: number;
          total_income: number;
          pic_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          name: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
          total_budget?: number;
          total_spent?: number;
          total_income?: number;
          pic_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          name?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
          total_budget?: number;
          total_spent?: number;
          total_income?: number;
          pic_id?: string | null;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activities_academic_year_id_fkey';
            columns: ['academic_year_id'];
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_pic_id_fkey';
            columns: ['pic_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      activity_budgets: {
        Row: {
          id: string;
          activity_id: string;
          item_name: string;
          category: 'OPERASIONAL' | 'KEGIATAN' | 'PERLENGKAPAN' | 'KONSUMSI' | 'TRANSPORTASI' | 'DOKUMENTASI' | 'SEWA' | 'LAINNYA';
          budgeted_amount: number;
          spent_amount: number;
          remaining_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          item_name: string;
          category: 'OPERASIONAL' | 'KEGIATAN' | 'PERLENGKAPAN' | 'KONSUMSI' | 'TRANSPORTASI' | 'DOKUMENTASI' | 'SEWA' | 'LAINNYA';
          budgeted_amount: number;
          spent_amount?: number;
          remaining_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          item_name?: string;
          category?: 'OPERASIONAL' | 'KEGIATAN' | 'PERLENGKAPAN' | 'KONSUMSI' | 'TRANSPORTASI' | 'DOKUMENTASI' | 'SEWA' | 'LAINNYA';
          budgeted_amount?: number;
          spent_amount?: number;
          remaining_amount?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_budgets_activity_id_fkey';
            columns: ['activity_id'];
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
        ];
      };

      income_records: {
        Row: {
          id: string;
          academic_year_id: string;
          activity_id: string | null;
          cash_account_id: string;
          category: 'DONASI' | 'SPONSOR' | 'PENDAPATAN_KEGIATAN' | 'LAINNYA';
          amount: number;
          description: string;
          income_date: string;
          reference_number: string | null;
          status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          recorded_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          evidence_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          activity_id?: string | null;
          cash_account_id: string;
          category: 'DONASI' | 'SPONSOR' | 'PENDAPATAN_KEGIATAN' | 'LAINNYA';
          amount: number;
          description: string;
          income_date: string;
          reference_number?: string | null;
          status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          recorded_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          evidence_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          activity_id?: string | null;
          cash_account_id?: string;
          category?: 'DONASI' | 'SPONSOR' | 'PENDAPATAN_KEGIATAN' | 'LAINNYA';
          amount?: number;
          description?: string;
          income_date?: string;
          reference_number?: string | null;
          status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          recorded_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          evidence_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'income_records_academic_year_id_fkey';
            columns: ['academic_year_id'];
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'income_records_activity_id_fkey';
            columns: ['activity_id'];
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'income_records_cash_account_id_fkey';
            columns: ['cash_account_id'];
            referencedRelation: 'cash_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'income_records_recorded_by_fkey';
            columns: ['recorded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'income_records_approved_by_fkey';
            columns: ['approved_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      expenses: {
        Row: {
          id: string;
          academic_year_id: string;
          activity_id: string | null;
          budget_item_id: string | null;
          cash_account_id: string;
          category: 'OPERASIONAL' | 'KEGIATAN' | 'PERLENGKAPAN' | 'KONSUMSI' | 'TRANSPORTASI' | 'DOKUMENTASI' | 'SEWA' | 'LAINNYA';
          amount: number;
          description: string;
          expense_date: string;
          reference_number: string | null;
          status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          recorded_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          evidence_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id: string;
          activity_id?: string | null;
          budget_item_id?: string | null;
          cash_account_id: string;
          category: 'OPERASIONAL' | 'KEGIATAN' | 'PERLENGKAPAN' | 'KONSUMSI' | 'TRANSPORTASI' | 'DOKUMENTASI' | 'SEWA' | 'LAINNYA';
          amount: number;
          description: string;
          expense_date: string;
          reference_number?: string | null;
          status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          recorded_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          evidence_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          academic_year_id?: string;
          activity_id?: string | null;
          budget_item_id?: string | null;
          cash_account_id?: string;
          category?: 'OPERASIONAL' | 'KEGIATAN' | 'PERLENGKAPAN' | 'KONSUMSI' | 'TRANSPORTASI' | 'DOKUMENTASI' | 'SEWA' | 'LAINNYA';
          amount?: number;
          description?: string;
          expense_date?: string;
          reference_number?: string | null;
          status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
          recorded_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          evidence_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_academic_year_id_fkey';
            columns: ['academic_year_id'];
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_activity_id_fkey';
            columns: ['activity_id'];
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_budget_item_id_fkey';
            columns: ['budget_item_id'];
            referencedRelation: 'activity_budgets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_cash_account_id_fkey';
            columns: ['cash_account_id'];
            referencedRelation: 'cash_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_recorded_by_fkey';
            columns: ['recorded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_approved_by_fkey';
            columns: ['approved_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      app_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'app_settings_updated_by_fkey';
            columns: ['updated_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      user_invitations: {
        Row: {
          id: string;
          email: string;
          role: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
          full_name: string | null;
          nim: string | null;
          academic_year_id: string | null;
          invited_by: string | null;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          is_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
          full_name?: string | null;
          nim?: string | null;
          academic_year_id?: string | null;
          invited_by?: string | null;
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          is_used?: boolean;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
          full_name?: string | null;
          nim?: string | null;
          academic_year_id?: string | null;
          invited_by?: string | null;
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          is_used?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'user_invitations_academic_year_id_fkey';
            columns: ['academic_year_id'];
            referencedRelation: 'academic_years';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_invitations_invited_by_fkey';
            columns: ['invited_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      /** Get the current user's role from their profile. */
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      /** Check if the current user has admin privileges. */
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      /** Check if the current user has treasurer (bendahara) privileges. */
      is_bendahara: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      /** Generate a unique payment code. */
      generate_payment_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      /** Get the currently active academic year ID. */
      get_active_academic_year_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      /** Calculate remaining amount for an obligation. */
      calculate_remaining_amount: {
        Args: { p_obligation_id: string };
        Returns: number;
      };
    };

    Enums: {
      user_role: 'ADMIN' | 'BENDAHARA' | 'MAHASISWA';
      academic_year_status: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'ARCHIVED';
      contribution_category: 'RUTIN' | 'KEGIATAN' | 'SEMINAR' | 'WORKSHOP' | 'KEPANITIAAN' | 'LAINNYA';
      contribution_frequency: 'WEEKLY' | 'MONTHLY' | 'ONE_TIME' | 'ACTIVITY_BASED';
      obligation_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
      payment_method: 'CASH' | 'QRIS';
      payment_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
      approval_status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'REVERSED';
      expense_category: 'OPERASIONAL' | 'KEGIATAN' | 'PERLENGKAPAN' | 'KONSUMSI' | 'TRANSPORTASI' | 'DOKUMENTASI' | 'SEWA' | 'LAINNYA';
      income_category: 'DONASI' | 'SPONSOR' | 'PENDAPATAN_KEGIATAN' | 'LAINNYA';
      activity_status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
      membership_status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED';
      fund_source_type: 'CONTRIBUTION' | 'ACTIVITY_INCOME' | 'DONATION' | 'TRANSFER' | 'OTHER';
      transfer_type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTER_ACCOUNT';
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ---------------------------------------------------------------------------
// Convenience type helpers
// ---------------------------------------------------------------------------

/** Shorthand to extract a Row type from any table. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Shorthand to extract an Insert type from any table. */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Shorthand to extract an Update type from any table. */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/** Shorthand to extract an Enum type. */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
