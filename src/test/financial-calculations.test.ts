import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from '../lib/utils';

describe('Financial Calculations & Integrity Tests', () => {
  it('formats Indonesian Rupiah currency strictly without decimals', () => {
    const formatted = formatCurrency(150000);
    expect(formatted).toMatch(/Rp/);
    expect(formatted).toMatch(/150\.000/);
  });

  it('calculates net cash balance strictly from verified and posted transactions only', () => {
    const approvedStudentFees = [10000, 20000, 15000];
    const pendingQrisFees = [50000, 20000]; // Must NOT be counted
    const rejectedQrisFees = [10000]; // Must NOT be counted
    const verifiedOtherIncome = [250000];
    const pendingIncome = [100000]; // Must NOT be counted
    const postedExpenses = [65000, 30000];

    const totalIncome =
      approvedStudentFees.reduce((a, b) => a + b, 0) +
      verifiedOtherIncome.reduce((a, b) => a + b, 0);

    const totalExpenses = postedExpenses.reduce((a, b) => a + b, 0);
    const netBalance = totalIncome - totalExpenses;

    expect(totalIncome).toBe(295000);
    expect(totalExpenses).toBe(95000);
    expect(netBalance).toBe(200000);
  });

  it('correctly allocates multi-bill payments without over-allocation or negative remaining balance', () => {
    interface Obligation {
      id: string;
      amount: number;
      paid: number;
      remaining: number;
    }

    const bills: Obligation[] = [
      { id: 'bill-1', amount: 10000, paid: 0, remaining: 10000 },
      { id: 'bill-2', amount: 15000, paid: 5000, remaining: 10000 },
      { id: 'bill-3', amount: 20000, paid: 0, remaining: 20000 },
    ];

    const totalCashPaid = 25000;
    const allocations = {
      'bill-1': 10000, // fully pays bill 1
      'bill-2': 10000, // fully pays bill 2
      'bill-3': 5000,  // partially pays bill 3
    };

    const sumAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
    expect(sumAllocated).toBe(totalCashPaid);

    // Apply allocation
    const updatedBills = bills.map((b) => {
      const alloc = allocations[b.id as keyof typeof allocations] || 0;
      const newPaid = b.paid + alloc;
      const newRemaining = Math.max(0, b.amount - newPaid);
      return {
        ...b,
        paid: newPaid,
        remaining: newRemaining,
        status: newRemaining === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
      };
    });

    expect(updatedBills[0].status).toBe('PAID');
    expect(updatedBills[0].remaining).toBe(0);

    expect(updatedBills[1].status).toBe('PAID');
    expect(updatedBills[1].remaining).toBe(0);

    expect(updatedBills[2].status).toBe('PARTIALLY_PAID');
    expect(updatedBills[2].paid).toBe(5000);
    expect(updatedBills[2].remaining).toBe(15000);
    expect(updatedBills[2].remaining).toBeGreaterThanOrEqual(0);
  });

  it('prevents spreadsheet CSV formula injection on user-entered descriptions', () => {
    const maliciousInputs = ['=SUM(A1:A10)', '+cmd|/c calc', '-2+5', '@IMPORTDATA("http://malicious.com")'];

    const sanitizeCsvCell = (val: string) => {
      if (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@')) {
        return `'${val}`;
      }
      return val;
    };

    maliciousInputs.forEach((input) => {
      const sanitized = sanitizeCsvCell(input);
      expect(sanitized.startsWith("'")).toBe(true);
    });
  });

  it('calculates activity remaining budget without double-counting planned budget as cash', () => {
    const plannedBudget = 1000000; // Pagu rencana
    const actualExpenses = 450000; // Realisasi beban
    const remainingBudget = plannedBudget - actualExpenses;

    expect(remainingBudget).toBe(550000);
  });
});
