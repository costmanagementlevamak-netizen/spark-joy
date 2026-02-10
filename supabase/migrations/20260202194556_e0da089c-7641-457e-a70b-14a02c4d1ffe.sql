-- Drop existing restrictive policies on settings
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;

-- Create comprehensive policies for settings
-- Allow authenticated users to SELECT
CREATE POLICY "Authenticated users can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE
CREATE POLICY "Authenticated users can update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to INSERT (for upsert)
CREATE POLICY "Authenticated users can insert settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure default settings row exists
INSERT INTO public.settings (id, institution_name, monthly_fee_base)
VALUES ('default', 'Logia', 50.00)
ON CONFLICT (id) DO NOTHING;