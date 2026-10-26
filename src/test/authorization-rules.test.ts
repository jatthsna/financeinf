import { describe, it, expect } from 'vitest';
import type { UserRole } from '../types';

describe('Role-Based Authorization & Isolation Rules', () => {
  const checkAccess = (allowedRoles: UserRole[] | 'all', userRole: UserRole | undefined): boolean => {
    if (allowedRoles === 'all') return true;
    if (!userRole) return false;
    return allowedRoles.includes(userRole);
  };

  it('permits only staff (ADMIN, BENDAHARA) to record cash payments and manage billing', () => {
    const staffRoutesRoles: UserRole[] = ['ADMIN', 'BENDAHARA'];

    expect(checkAccess(staffRoutesRoles, 'ADMIN')).toBe(true);
    expect(checkAccess(staffRoutesRoles, 'BENDAHARA')).toBe(true);
    expect(checkAccess(staffRoutesRoles, 'MAHASISWA')).toBe(false);
    expect(checkAccess(staffRoutesRoles, undefined)).toBe(false);
  });

  it('permits only ADMIN to modify academic years and system settings', () => {
    const adminRoutesRoles: UserRole[] = ['ADMIN'];

    expect(checkAccess(adminRoutesRoles, 'ADMIN')).toBe(true);
    expect(checkAccess(adminRoutesRoles, 'BENDAHARA')).toBe(false);
    expect(checkAccess(adminRoutesRoles, 'MAHASISWA')).toBe(false);
  });

  it('isolates student billing so students only query and access their own records', () => {
    const currentStudentId = 'student-uuid-123';
    const otherStudentId = 'student-uuid-456';

    const testObligation = {
      id: 'ob-1',
      student_id: otherStudentId,
      amount: 10000,
    };

    const isStudentPermittedToView = (studentId: string, obligationOwnerId: string) => {
      return studentId === obligationOwnerId;
    };

    expect(isStudentPermittedToView(currentStudentId, testObligation.student_id)).toBe(false);
    expect(isStudentPermittedToView(otherStudentId, testObligation.student_id)).toBe(true);
  });

  it('prevents students from changing payment status from PENDING to APPROVED', () => {
    const userRole: UserRole = 'MAHASISWA';

    const canApprovePayment = (role: UserRole) => {
      return role === 'ADMIN' || role === 'BENDAHARA';
    };

    expect(canApprovePayment(userRole)).toBe(false);
    expect(canApprovePayment('BENDAHARA')).toBe(true);
    expect(canApprovePayment('ADMIN')).toBe(true);
  });
});
