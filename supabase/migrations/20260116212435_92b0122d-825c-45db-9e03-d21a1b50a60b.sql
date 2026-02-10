-- ============================================
-- CORRECCIÓN DEFINITIVA DE RLS
-- Eliminar TODAS las políticas existentes y recrearlas como PERMISSIVE
-- ============================================

-- 1. TABLA MEMBERS
DROP POLICY IF EXISTS "Authenticated users can select members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to select members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to insert members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to update members" ON public.members;
DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON public.members;

CREATE POLICY "Allow all SELECT on members" ON public.members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all INSERT on members" ON public.members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on members" ON public.members
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all DELETE on members" ON public.members
  FOR DELETE TO authenticated USING (true);

-- 2. TABLA EXPENSES
DROP POLICY IF EXISTS "Authenticated users can select expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated users to select expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated users to delete expenses" ON public.expenses;

CREATE POLICY "Allow all SELECT on expenses" ON public.expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all INSERT on expenses" ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on expenses" ON public.expenses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all DELETE on expenses" ON public.expenses
  FOR DELETE TO authenticated USING (true);

-- 3. TABLA EXTRAORDINARY_INCOME
DROP POLICY IF EXISTS "Authenticated users can select extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Authenticated users can insert extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Authenticated users can update extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Authenticated users can delete extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Allow authenticated users to select extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Allow authenticated users to insert extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Allow authenticated users to update extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Allow authenticated users to delete extraordinary_income" ON public.extraordinary_income;

CREATE POLICY "Allow all SELECT on extraordinary_income" ON public.extraordinary_income
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all INSERT on extraordinary_income" ON public.extraordinary_income
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on extraordinary_income" ON public.extraordinary_income
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all DELETE on extraordinary_income" ON public.extraordinary_income
  FOR DELETE TO authenticated USING (true);

-- 4. TABLA EXTRAORDINARY_PAYMENTS
DROP POLICY IF EXISTS "Authenticated users can select extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can insert extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can update extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can delete extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Allow authenticated users to select extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Allow authenticated users to update extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete extraordinary_payments" ON public.extraordinary_payments;

CREATE POLICY "Allow all SELECT on extraordinary_payments" ON public.extraordinary_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all INSERT on extraordinary_payments" ON public.extraordinary_payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on extraordinary_payments" ON public.extraordinary_payments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all DELETE on extraordinary_payments" ON public.extraordinary_payments
  FOR DELETE TO authenticated USING (true);

-- 5. TABLA MONTHLY_PAYMENTS
DROP POLICY IF EXISTS "Authenticated users can select monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can insert monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can update monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can delete monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Allow authenticated users to select monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Allow authenticated users to update monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete monthly_payments" ON public.monthly_payments;

CREATE POLICY "Allow all SELECT on monthly_payments" ON public.monthly_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all INSERT on monthly_payments" ON public.monthly_payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all UPDATE on monthly_payments" ON public.monthly_payments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all DELETE on monthly_payments" ON public.monthly_payments
  FOR DELETE TO authenticated USING (true);