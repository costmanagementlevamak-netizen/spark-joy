
-- Create storage buckets for logos and signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for logos bucket
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- RLS policies for signatures bucket
CREATE POLICY "Anyone can view signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Authenticated users can upload signatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update signatures" ON storage.objects FOR UPDATE USING (bucket_id = 'signatures' AND auth.role() = 'authenticated');

-- Add missing columns to settings table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS treasurer_id uuid;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS treasurer_signature_url text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vm_signature_url text;
