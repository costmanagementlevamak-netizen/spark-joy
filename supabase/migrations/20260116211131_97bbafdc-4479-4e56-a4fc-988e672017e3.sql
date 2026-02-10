-- Fix RLS policies: Change from RESTRICTIVE to PERMISSIVE
-- This is the core issue - policies were created as RESTRICTIVE instead of PERMISSIVE

-- Drop existing RESTRICTIVE policies for members
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;

-- Create PERMISSIVE policies for members
CREATE POLICY "Authenticated users can select members" 
ON public.members FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert members" 
ON public.members FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update members" 
ON public.members FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete members" 
ON public.members FOR DELETE 
TO authenticated 
USING (true);

-- Drop existing RESTRICTIVE policies for expenses
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;

-- Create PERMISSIVE policies for expenses
CREATE POLICY "Authenticated users can select expenses" 
ON public.expenses FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert expenses" 
ON public.expenses FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update expenses" 
ON public.expenses FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete expenses" 
ON public.expenses FOR DELETE 
TO authenticated 
USING (true);

-- Drop existing RESTRICTIVE policies for extraordinary_income
DROP POLICY IF EXISTS "Authenticated users can delete extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Authenticated users can insert extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Authenticated users can update extraordinary_income" ON public.extraordinary_income;
DROP POLICY IF EXISTS "Authenticated users can view extraordinary_income" ON public.extraordinary_income;

-- Create PERMISSIVE policies for extraordinary_income
CREATE POLICY "Authenticated users can select extraordinary_income" 
ON public.extraordinary_income FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert extraordinary_income" 
ON public.extraordinary_income FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update extraordinary_income" 
ON public.extraordinary_income FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete extraordinary_income" 
ON public.extraordinary_income FOR DELETE 
TO authenticated 
USING (true);

-- Drop existing RESTRICTIVE policies for extraordinary_payments
DROP POLICY IF EXISTS "Authenticated users can delete extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can insert extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can update extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can view extraordinary_payments" ON public.extraordinary_payments;

-- Create PERMISSIVE policies for extraordinary_payments
CREATE POLICY "Authenticated users can select extraordinary_payments" 
ON public.extraordinary_payments FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert extraordinary_payments" 
ON public.extraordinary_payments FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update extraordinary_payments" 
ON public.extraordinary_payments FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete extraordinary_payments" 
ON public.extraordinary_payments FOR DELETE 
TO authenticated 
USING (true);

-- Drop existing RESTRICTIVE policies for monthly_payments
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.monthly_payments;

-- Create PERMISSIVE policies for monthly_payments
CREATE POLICY "Authenticated users can select monthly_payments" 
ON public.monthly_payments FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert monthly_payments" 
ON public.monthly_payments FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update monthly_payments" 
ON public.monthly_payments FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete monthly_payments" 
ON public.monthly_payments FOR DELETE 
TO authenticated 
USING (true);