
-- Add logo_url and initial_balance to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS initial_balance NUMERIC DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS period_start_month INTEGER DEFAULT 7;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS period_start_year INTEGER DEFAULT 2025;

-- Create logo storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Authenticated users can update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');
