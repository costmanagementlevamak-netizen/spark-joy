
-- =====================================================
-- FIX RLS: Drop RESTRICTIVE policies, create PERMISSIVE ones
-- =====================================================

-- degree_fees
DROP POLICY IF EXISTS "Authenticated users can delete degree_fees" ON public.degree_fees;
DROP POLICY IF EXISTS "Authenticated users can insert degree_fees" ON public.degree_fees;
DROP POLICY IF EXISTS "Authenticated users can update degree_fees" ON public.degree_fees;
DROP POLICY IF EXISTS "Authenticated users can view degree_fees" ON public.degree_fees;

CREATE POLICY "Allow all for authenticated - degree_fees select" ON public.degree_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - degree_fees insert" ON public.degree_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated - degree_fees update" ON public.degree_fees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - degree_fees delete" ON public.degree_fees FOR DELETE TO authenticated USING (true);

-- expenses
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;

CREATE POLICY "Allow all for authenticated - expenses select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - expenses insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated - expenses update" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - expenses delete" ON public.expenses FOR DELETE TO authenticated USING (true);

-- extraordinary_fees
DROP POLICY IF EXISTS "Authenticated users can delete extraordinary_fees" ON public.extraordinary_fees;
DROP POLICY IF EXISTS "Authenticated users can insert extraordinary_fees" ON public.extraordinary_fees;
DROP POLICY IF EXISTS "Authenticated users can update extraordinary_fees" ON public.extraordinary_fees;
DROP POLICY IF EXISTS "Authenticated users can view extraordinary_fees" ON public.extraordinary_fees;

CREATE POLICY "Allow all for authenticated - extraordinary_fees select" ON public.extraordinary_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - extraordinary_fees insert" ON public.extraordinary_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated - extraordinary_fees update" ON public.extraordinary_fees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - extraordinary_fees delete" ON public.extraordinary_fees FOR DELETE TO authenticated USING (true);

-- extraordinary_payments
DROP POLICY IF EXISTS "Authenticated users can delete extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can insert extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can update extraordinary_payments" ON public.extraordinary_payments;
DROP POLICY IF EXISTS "Authenticated users can view extraordinary_payments" ON public.extraordinary_payments;

CREATE POLICY "Allow all for authenticated - extraordinary_payments select" ON public.extraordinary_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - extraordinary_payments insert" ON public.extraordinary_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated - extraordinary_payments update" ON public.extraordinary_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - extraordinary_payments delete" ON public.extraordinary_payments FOR DELETE TO authenticated USING (true);

-- members
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;

CREATE POLICY "Allow all for authenticated - members select" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - members insert" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated - members update" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - members delete" ON public.members FOR DELETE TO authenticated USING (true);

-- monthly_payments
DROP POLICY IF EXISTS "Authenticated users can delete monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can insert monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can update monthly_payments" ON public.monthly_payments;
DROP POLICY IF EXISTS "Authenticated users can view monthly_payments" ON public.monthly_payments;

CREATE POLICY "Allow all for authenticated - monthly_payments select" ON public.monthly_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - monthly_payments insert" ON public.monthly_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated - monthly_payments update" ON public.monthly_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - monthly_payments delete" ON public.monthly_payments FOR DELETE TO authenticated USING (true);

-- settings
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;

CREATE POLICY "Allow all for authenticated - settings select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - settings insert" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated - settings update" ON public.settings FOR UPDATE TO authenticated USING (true);

-- user_roles - make open for now
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Allow all for authenticated - user_roles select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated - user_roles all" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- ADD NEW COLUMNS
-- =====================================================

-- Cargo logial for members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS cargo_logial text;

-- Settings: logo, treasurer, signatures
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS treasurer_id uuid;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS treasurer_signature_url text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vm_signature_url text;

-- =====================================================
-- STORAGE BUCKETS AND POLICIES
-- =====================================================

-- Create logos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

-- Create signatures bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploads (public buckets auto-allow SELECT)
CREATE POLICY "auth_upload_receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "auth_update_receipts" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'receipts');
CREATE POLICY "auth_upload_logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY "auth_update_logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "auth_upload_signatures" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signatures');
CREATE POLICY "auth_update_signatures" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'signatures');
