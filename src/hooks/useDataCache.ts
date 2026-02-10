import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';

export interface Member {
  id: string;
  full_name: string;
  degree: string | null;
  status: string | null;
  is_treasurer: boolean | null;
  treasury_amount: number | null;
  cargo_logial: string | null;
  created_at: string;
  email: string | null;
  phone: string | null;
  cedula: string | null;
  address: string | null;
  join_date: string | null;
  birth_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface MonthlyPayment {
  id: string;
  member_id: string;
  month: number;
  year: number;
  amount: number;
  paid_at: string | null;
  status?: string | null;
  receipt_url?: string | null;
  payment_type?: string | null; // 'regular', 'adelantado', 'pronto_pago', 'pp'
  quick_pay_group_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface ExtraordinaryIncome {
  id: string;
  name: string;
  description: string | null;
  amount_per_member: number;
  due_date: string | null;
  is_mandatory: boolean | null;
  category: string | null;
  created_at: string;
}

export interface ExtraordinaryPayment {
  id: string;
  extraordinary_fee_id: string;
  member_id: string;
  amount_paid: number;
  payment_date: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  institution_name: string | null;
  monthly_fee_base: number | null;
  monthly_report_template: string | null;
  annual_report_template: string | null;
}

// Pre-computed summary for instant access
export interface CacheSummary {
  totalIncome: number;
  totalExpenses: number;
  totalExtraordinaryIncome: number;
  balance: number;
  memberCount: number;
  pendingPayments: number;
  paidPaymentsCount: number;
}

interface CacheData {
  members: Member[];
  monthlyPayments: MonthlyPayment[];
  expenses: Expense[];
  extraordinaryIncomes: ExtraordinaryIncome[];
  extraordinaryPayments: ExtraordinaryPayment[];
  settings: Settings | null;
  summary: CacheSummary;
  lastUpdated: number;
}

// Global cache singleton - persists across component mounts
let globalCache: CacheData | null = null;
let loadingPromise: Promise<CacheData> | null = null;
const subscribers = new Set<() => void>();
let isInitialized = false;

// Compute summary from raw data
function computeSummary(
  members: Member[],
  monthlyPayments: MonthlyPayment[],
  expenses: Expense[],
  extraordinaryPayments: ExtraordinaryPayment[]
): CacheSummary {
  const activeMembers = members.filter(m => m.status === 'activo');
  // All payments in monthly_payments are paid (existence = paid)
  // Exclude P.P benefit payments from income calculations (they have 0 monetary value)
  const paidPayments = monthlyPayments.filter(p => p.payment_type !== 'pronto_pago_benefit');
  
  const totalMonthlyIncome = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExtraordinaryIncome = extraordinaryPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

  return {
    totalIncome: totalMonthlyIncome + totalExtraordinaryIncome,
    totalExpenses,
    totalExtraordinaryIncome,
    balance: totalMonthlyIncome + totalExtraordinaryIncome - totalExpenses,
    memberCount: activeMembers.length,
    pendingPayments: 0, // Will be calculated elsewhere based on missing months
    paidPaymentsCount: paidPayments.length
  };
}

async function fetchAllData(): Promise<CacheData> {
  const timeout = 15000; // 15 second timeout
  
  const fetchWithTimeout = async () => {
    const [
      membersResult,
      paymentsResult,
      expensesResult,
      extraordinaryFeesResult,
      extraordinaryPaymentsResult,
      settingsResult
    ] = await Promise.all([
      supabase.from('members').select('*').order('full_name'),
      supabase.from('monthly_payments').select('*'),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('extraordinary_fees').select('*').order('created_at', { ascending: false }),
      supabase.from('extraordinary_payments').select('*'),
      // FIXED: Get first settings row (id is UUID, not 'default')
      supabase.from('settings').select('*').limit(1).maybeSingle()
    ]);

    const members = (membersResult.data || []) as Member[];
    const monthlyPayments = (paymentsResult.data || []) as MonthlyPayment[];
    const expenses = (expensesResult.data || []) as Expense[];
    const extraordinaryIncomes = (extraordinaryFeesResult.data || []) as ExtraordinaryIncome[];
    const extraordinaryPayments = (extraordinaryPaymentsResult.data || []) as ExtraordinaryPayment[];
    const settings = settingsResult.data as Settings | null;

    const summary = computeSummary(members, monthlyPayments, expenses, extraordinaryPayments);

    return {
      members,
      monthlyPayments,
      expenses,
      extraordinaryIncomes,
      extraordinaryPayments,
      settings,
      summary,
      lastUpdated: Date.now()
    };
  };

  // Race between fetch and timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Data fetch timeout')), timeout);
  });

  try {
    return await Promise.race([fetchWithTimeout(), timeoutPromise]);
  } catch (error) {
    console.error('Error fetching data:', error);
    // Return empty cache data on error instead of hanging
    return {
      members: [],
      monthlyPayments: [],
      expenses: [],
      extraordinaryIncomes: [],
      extraordinaryPayments: [],
      settings: null,
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        totalExtraordinaryIncome: 0,
        balance: 0,
        memberCount: 0,
        pendingPayments: 0,
        paidPaymentsCount: 0
      },
      lastUpdated: Date.now()
    };
  }
}

// Notify all subscribers of cache update
function notifySubscribers() {
  subscribers.forEach(fn => fn());
}

function rebuildCache(next: Omit<CacheData, "summary" | "lastUpdated">): CacheData {
  return {
    ...next,
    summary: computeSummary(next.members, next.monthlyPayments, next.expenses, next.extraordinaryPayments),
    lastUpdated: Date.now(),
  };
}

/**
 * Apply a synchronous mutation to the in-memory cache and notify all consumers.
 * This is the only safe way to guarantee instant cross-module updates without waiting for a re-fetch.
 */
export function mutateGlobalCache(mutator: (draft: CacheData) => CacheData): void {
  if (!globalCache) return;
  globalCache = mutator(globalCache);
  notifySubscribers();
}

export function upsertCachedMonthlyPayment(payment: MonthlyPayment): void {
  mutateGlobalCache((draft) => {
    const idx = draft.monthlyPayments.findIndex((p) => p.id === payment.id);
    const nextMonthlyPayments = [...draft.monthlyPayments];
    if (idx >= 0) nextMonthlyPayments[idx] = payment;
    else nextMonthlyPayments.push(payment);

    return rebuildCache({
      members: draft.members,
      monthlyPayments: nextMonthlyPayments,
      expenses: draft.expenses,
      extraordinaryIncomes: draft.extraordinaryIncomes,
      extraordinaryPayments: draft.extraordinaryPayments,
      settings: draft.settings,
    });
  });
}

export function upsertCachedExpense(expense: Expense): void {
  mutateGlobalCache((draft) => {
    const idx = draft.expenses.findIndex((e) => e.id === expense.id);
    const nextExpenses = [...draft.expenses];
    if (idx >= 0) nextExpenses[idx] = expense;
    else nextExpenses.unshift(expense); // keep newest first

    return rebuildCache({
      members: draft.members,
      monthlyPayments: draft.monthlyPayments,
      expenses: nextExpenses,
      extraordinaryIncomes: draft.extraordinaryIncomes,
      extraordinaryPayments: draft.extraordinaryPayments,
      settings: draft.settings,
    });
  });
}

export function removeCachedExpense(id: string): void {
  mutateGlobalCache((draft) => {
    const nextExpenses = draft.expenses.filter((e) => e.id !== id);
    return rebuildCache({
      members: draft.members,
      monthlyPayments: draft.monthlyPayments,
      expenses: nextExpenses,
      extraordinaryIncomes: draft.extraordinaryIncomes,
      extraordinaryPayments: draft.extraordinaryPayments,
      settings: draft.settings,
    });
  });
}

export function upsertCachedExtraordinaryIncome(income: ExtraordinaryIncome): void {
  mutateGlobalCache((draft) => {
    const idx = draft.extraordinaryIncomes.findIndex((i) => i.id === income.id);
    const nextIncomes = [...draft.extraordinaryIncomes];
    if (idx >= 0) nextIncomes[idx] = income;
    else nextIncomes.unshift(income);

    return rebuildCache({
      members: draft.members,
      monthlyPayments: draft.monthlyPayments,
      expenses: draft.expenses,
      extraordinaryIncomes: nextIncomes,
      extraordinaryPayments: draft.extraordinaryPayments,
      settings: draft.settings,
    });
  });
}

export function removeCachedExtraordinaryIncome(incomeId: string): void {
  mutateGlobalCache((draft) => {
    const nextIncomes = draft.extraordinaryIncomes.filter((i) => i.id !== incomeId);
    const nextPayments = draft.extraordinaryPayments.filter((p) => p.extraordinary_fee_id !== incomeId);
    return rebuildCache({
      members: draft.members,
      monthlyPayments: draft.monthlyPayments,
      expenses: draft.expenses,
      extraordinaryIncomes: nextIncomes,
      extraordinaryPayments: nextPayments,
      settings: draft.settings,
    });
  });
}

export function upsertCachedExtraordinaryPayment(payment: ExtraordinaryPayment): void {
  mutateGlobalCache((draft) => {
    const idx = draft.extraordinaryPayments.findIndex((p) => p.id === payment.id);
    const nextPayments = [...draft.extraordinaryPayments];
    if (idx >= 0) nextPayments[idx] = payment;
    else nextPayments.unshift(payment);

    return rebuildCache({
      members: draft.members,
      monthlyPayments: draft.monthlyPayments,
      expenses: draft.expenses,
      extraordinaryIncomes: draft.extraordinaryIncomes,
      extraordinaryPayments: nextPayments,
      settings: draft.settings,
    });
  });
}

export function removeCachedExtraordinaryPayment(paymentId: string): void {
  mutateGlobalCache((draft) => {
    const nextPayments = draft.extraordinaryPayments.filter((p) => p.id !== paymentId);
    return rebuildCache({
      members: draft.members,
      monthlyPayments: draft.monthlyPayments,
      expenses: draft.expenses,
      extraordinaryIncomes: draft.extraordinaryIncomes,
      extraordinaryPayments: nextPayments,
      settings: draft.settings,
    });
  });
}

export function removeCachedMember(memberId: string): void {
  mutateGlobalCache((draft) => {
    const nextMembers = draft.members.filter((m) => m.id !== memberId);
    const nextMonthlyPayments = draft.monthlyPayments.filter((p) => p.member_id !== memberId);
    const nextExtraPayments = draft.extraordinaryPayments.filter((p) => p.member_id !== memberId);

    return rebuildCache({
      members: nextMembers,
      monthlyPayments: nextMonthlyPayments,
      expenses: draft.expenses,
      extraordinaryIncomes: draft.extraordinaryIncomes,
      extraordinaryPayments: nextExtraPayments,
      settings: draft.settings,
    });
  });
}

export function useDataCache() {
  const [cache, setCache] = useState<CacheData | null>(globalCache);
  const [loading, setLoading] = useState(!globalCache);
  const mountedRef = useRef(true);

  const loadCache = useCallback(async (force = false) => {
    // Return immediately if cache exists and not forcing
    if (!force && globalCache) {
      if (mountedRef.current) {
        setCache(globalCache);
        setLoading(false);
      }
      return globalCache;
    }

    // If already loading, wait for that promise
    if (loadingPromise) {
      const data = await loadingPromise;
      if (mountedRef.current) {
        setCache(data);
        setLoading(false);
      }
      return data;
    }

    // Start new load
    if (mountedRef.current) setLoading(true);
    loadingPromise = fetchAllData();
    
    try {
      const data = await loadingPromise;
      globalCache = data;
      loadingPromise = null;
      
      // Notify all subscribers
      notifySubscribers();
      
      if (mountedRef.current) {
        setCache(data);
        setLoading(false);
      }
      return data;
    } catch (error) {
      loadingPromise = null;
      if (mountedRef.current) setLoading(false);
      throw error;
    }
  }, []);

  const invalidateCache = useCallback(async () => {
    globalCache = null;
    return loadCache(true);
  }, [loadCache]);

  useEffect(() => {
    mountedRef.current = true;
    
    const subscriber = () => {
      if (!mountedRef.current) return;
      setCache(globalCache);
      setLoading(!globalCache);
    };
    subscribers.add(subscriber);
    
    // If cache already exists, use it immediately (no loading)
    if (globalCache) {
      setCache(globalCache);
      setLoading(false);
    } else {
      loadCache();
    }
    
    return () => {
      mountedRef.current = false;
      subscribers.delete(subscriber);
    };
  }, [loadCache]);

  // Computed values from cache
  const activeMembers = cache?.members.filter(m => m.status === 'activo') || [];
  
  // FIXED: Get treasurer from database - if multiple exist (historical error), take the most recent one
  const treasurer = (() => {
    if (!cache?.members) return null;
    const treasurers = cache.members.filter(m => m.is_treasurer === true);
    if (treasurers.length === 0) return null;
    if (treasurers.length === 1) return treasurers[0];
    // Multiple treasurers found - take the most recently updated one
    return treasurers.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Most recent first
    })[0];
  })();
  
  const monthlyFee = cache?.settings?.monthly_fee_base || 50;
  const institutionName = cache?.settings?.institution_name || 'Logia';

  return {
    // Raw data
    members: cache?.members || [],
    monthlyPayments: cache?.monthlyPayments || [],
    expenses: cache?.expenses || [],
    extraordinaryIncomes: cache?.extraordinaryIncomes || [],
    extraordinaryPayments: cache?.extraordinaryPayments || [],
    settings: cache?.settings,
    
    // Pre-computed summary for instant display
    summary: cache?.summary || null,
    
    // Computed
    activeMembers,
    treasurer,
    monthlyFee,
    institutionName,
    
    // State - only true if no cache exists
    loading: loading && !cache,
    
    // Actions
    refresh: invalidateCache,
    loadCache
  };
}

// Prefetch data on app load - called from main.tsx
export async function prefetchData(): Promise<void> {
  if (!globalCache && !loadingPromise) {
    loadingPromise = fetchAllData();
    globalCache = await loadingPromise;
    loadingPromise = null;
    isInitialized = true;
    notifySubscribers();
  }
}

// Invalidate cache from outside React (e.g., after mutations)
export function invalidateGlobalCache(): void {
  globalCache = null;
  notifySubscribers();
}

// Check if cache is ready
export function isCacheReady(): boolean {
  return !!globalCache;
}
