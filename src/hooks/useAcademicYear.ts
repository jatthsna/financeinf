// ========================================
// KAS INFORMATIKA - useAcademicYear Hook
// ========================================

import { useContext } from 'react';
import { AcademicYearContext } from '@/contexts/AcademicYearContext';
import type { AcademicYearContextType } from '@/contexts/AcademicYearContext';

export function useAcademicYear(): AcademicYearContextType {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
}
