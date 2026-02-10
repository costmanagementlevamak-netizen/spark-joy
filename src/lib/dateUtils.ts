/**
 * Centralized date utilities for the entire application.
 * All dates should reference this module for consistency.
 * 
 * Uses real-time date (no fixed date)
 */

/**
 * Get the current system date (real-time)
 */
export function getSystemDate(): Date {
  return new Date();
}

/**
 * Get the current system year
 */
export function getSystemYear(): number {
  return getSystemDate().getFullYear();
}

/**
 * Get the current system month (1-12)
 */
export function getSystemMonth(): number {
  return getSystemDate().getMonth() + 1;
}

/**
 * Get the current system day of month
 */
export function getSystemDay(): number {
  return getSystemDate().getDate();
}

/**
 * Get a formatted date string for forms (YYYY-MM-DD)
 */
export function getSystemDateString(): string {
  const d = getSystemDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get formatted date for display in Spanish
 */
export function getFormattedSystemDate(): string {
  return getSystemDate().toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Check if a birth date matches today's date (month and day)
 */
export function isBirthdayToday(birthDate: string | null): boolean {
  if (!birthDate) return false;
  
  const today = getSystemDate();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  
  const parts = birthDate.split('-');
  if (parts.length !== 3) return false;
  
  const birthMonth = parseInt(parts[1], 10);
  const birthDay = parseInt(parts[2], 10);
  
  return birthMonth === todayMonth && birthDay === todayDay;
}

/**
 * Get fiscal year info (July to June)
 */
export function getFiscalYearInfo(): {
  fiscalYear: number;
  startMonth: number;
  endMonth: number;
  currentCalendarYear: number;
  nextCalendarYear: number;
} {
  const date = getSystemDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  const fiscalYear = month >= 7 ? year : year - 1;
  
  return {
    fiscalYear,
    startMonth: 7,
    endMonth: 6,
    currentCalendarYear: fiscalYear,
    nextCalendarYear: fiscalYear + 1,
  };
}

/**
 * Get all 12 months of the current fiscal year with their years
 */
export function getFiscalYearMonths(): Array<{ month: number; year: number; monthIndex: number }> {
  const { fiscalYear } = getFiscalYearInfo();
  const months = [];
  
  for (let m = 7; m <= 12; m++) {
    months.push({ month: m, year: fiscalYear, monthIndex: m - 7 });
  }
  
  for (let m = 1; m <= 6; m++) {
    months.push({ month: m, year: fiscalYear + 1, monthIndex: m + 5 });
  }
  
  return months;
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const FISCAL_MONTH_ORDER = [
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'
];

/**
 * Format a date string (YYYY-MM-DD) for display without timezone conversion issues
 */
export function formatDateForDisplay(dateString: string | null): string {
  if (!dateString) return '-';
  
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;
  
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}
