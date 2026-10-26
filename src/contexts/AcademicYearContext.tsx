// ========================================
// KAS INFORMATIKA - Academic Year Context
// ========================================

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AcademicYear } from '@/types';

const STORAGE_KEY = 'kas-informatika-active-year';

export interface AcademicYearContextType {
  academicYears: AcademicYear[];
  activeYear: AcademicYear | null;
  setActiveYear: (year: AcademicYear) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [activeYear, setActiveYearState] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcademicYears = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const years = (data ?? []) as AcademicYear[];
      setAcademicYears(years);

      const fallbackYear: AcademicYear = {
        id: '2026-default',
        year_code: '2026/2027',
        display_name: 'Tahun Akademik 2026/2027',
        start_date: '2026-09-01',
        end_date: '2027-08-31',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      };

      // Restore from localStorage or default to the ACTIVE year
      const storedId = localStorage.getItem(STORAGE_KEY);
      const storedYear = storedId ? years.find((y) => y.id === storedId) : null;
      const defaultYear = storedYear ?? years.find((y) => y.status === 'ACTIVE' || y.is_active) ?? years[0] ?? fallbackYear;

      setActiveYearState(defaultYear);
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setError('Gagal memuat data tahun akademik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  const setActiveYear = useCallback((year: AcademicYear) => {
    setActiveYearState(year);
    localStorage.setItem(STORAGE_KEY, year.id);
  }, []);

  const value = useMemo<AcademicYearContextType>(
    () => ({
      academicYears,
      activeYear,
      setActiveYear,
      loading,
      error,
      refetch: fetchAcademicYears,
    }),
    [academicYears, activeYear, setActiveYear, loading, error, fetchAcademicYears]
  );

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}
