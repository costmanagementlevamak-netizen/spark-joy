import { useMemo } from 'react';
import { useDataCache, MonthlyPayment, Member } from './useDataCache';
import { getFiscalYearInfo, getFiscalYearMonths, FISCAL_MONTH_ORDER } from '@/lib/dateUtils';

export interface PendingMonth {
  month: number;
  year: number;
  amount: number;
  monthName: string;
}

export interface DebtInfo {
  monthsOverdue: number;
  totalOwed: number;
  memberMonthlyFee: number;
  cumulativeExpectedFee: number; // Total cuotas que debería haber pagado hasta la fecha
  pendingMonths: PendingMonth[];
  fiscalYearLabel: string; // e.g., "2025-2026"
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Core calculation function for member debt based on FISCAL YEAR (July to June)
 * 
 * CRITICAL RULES:
 * 1. Only counts payments with amount > 0 as paid
 * 2. Uses fiscal year (Jul-Jun), NOT calendar year
 * 3. Pending months = all fiscal year months WITHOUT a valid payment (amount > 0)
 * 4. Total owed = pending months × member's individual monthly fee
 */
function calculateDebt(
  member: Member,
  monthlyPayments: MonthlyPayment[],
  defaultMonthlyFee: number
): DebtInfo {
  // Always use the global monthly fee from settings
  const memberFee = defaultMonthlyFee;
  
  // Get current fiscal year info
  const fiscalInfo = getFiscalYearInfo();
  const fiscalYearMonths = getFiscalYearMonths();
  const fiscalYearLabel = `${fiscalInfo.fiscalYear}-${fiscalInfo.fiscalYear + 1}`;
  
  // Get all VALID payments for this member (amount > 0 means actually paid)
  // A record with amount = 0 does NOT count as paid
  const memberPaidPayments = monthlyPayments.filter(
    p => p.member_id === member.id && Number(p.amount) > 0
  );
  
  // Create a set of paid month-year combinations
  const paidMonthsSet = new Set(memberPaidPayments.map(p => `${p.year}-${p.month}`));

  // Calculate pending months ONLY for the current fiscal year
  const pendingMonths: PendingMonth[] = [];
  let totalExpectedMonths = 0;

  // Iterate through all 12 months of the fiscal year in order (Jul-Jun)
  for (const { month, year } of fiscalYearMonths) {
    totalExpectedMonths++;
    const key = `${year}-${month}`;
    
    if (!paidMonthsSet.has(key)) {
      pendingMonths.push({ 
        month, 
        year, 
        amount: memberFee,
        monthName: MONTH_NAMES[month - 1]
      });
    }
  }

  const monthsOverdue = pendingMonths.length;
  const totalOwed = monthsOverdue * memberFee;
  const cumulativeExpectedFee = totalExpectedMonths * memberFee;

  return {
    monthsOverdue,
    totalOwed,
    memberMonthlyFee: memberFee,
    cumulativeExpectedFee,
    pendingMonths,
    fiscalYearLabel
  };
}

// React Hook version - INSTANT: no loading states when cache exists
export function useDebtCalculation(memberId: string | null): {
  debtInfo: DebtInfo | null;
  loading: boolean;
} {
  const { monthlyPayments, members, monthlyFee } = useDataCache();

  // Calculate debt synchronously from cache - NO async operations
  const debtInfo = useMemo(() => {
    // No member selected = no calculation needed
    if (!memberId) return null;
    
    // Find member in already-loaded cache
    const member = members.find(m => m.id === memberId);
    if (!member) return null;

    // Synchronous calculation from cached data
    return calculateDebt(member, monthlyPayments, monthlyFee);
  }, [memberId, monthlyPayments, members, monthlyFee]);

  // NEVER show loading - calculation is synchronous from cache
  // The cache itself handles loading on app init, not here
  return { debtInfo, loading: false };
}

// Direct function for use in reports (non-hook)
export function calculateMemberDebt(
  memberId: string,
  members: Member[],
  monthlyPayments: MonthlyPayment[],
  monthlyFee: number
): DebtInfo | null {
  const member = members.find(m => m.id === memberId);
  if (!member) return null;

  return calculateDebt(member, monthlyPayments, monthlyFee);
}

// Format pending months for display - in fiscal year order
export function formatPendingMonths(pendingMonths: PendingMonth[], maxDisplay = 6): string {
  if (pendingMonths.length === 0) return 'Ninguno';
  
  const displayMonths = pendingMonths.slice(0, maxDisplay);
  const formatted = displayMonths
    .map(pm => `${pm.monthName.substring(0, 3)} ${pm.year}`)
    .join(', ');
  
  if (pendingMonths.length > maxDisplay) {
    return `${formatted} (+${pendingMonths.length - maxDisplay} más)`;
  }
  
  return formatted;
}

// Format pending months for PDF (full month names)
export function formatPendingMonthsForPDF(pendingMonths: PendingMonth[]): string {
  if (pendingMonths.length === 0) return 'Ninguno';
  
  return pendingMonths
    .map(pm => `${pm.monthName} ${pm.year}`)
    .join(', ');
}
