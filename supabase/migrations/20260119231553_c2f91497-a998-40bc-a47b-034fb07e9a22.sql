-- Create storage bucket for receipts (expenses, payments, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Create storage policies for receipts bucket
CREATE POLICY "Allow public read access on receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Allow public insert on receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Allow public update on receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts');

CREATE POLICY "Allow public delete on receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts');

-- Create settings table for financial parameters and messages
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 7,
  whatsapp_message_template TEXT DEFAULT 'Estimado hermano, le recordamos que tiene un saldo pendiente de ${monto}. Agradecemos su pronta atención.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Public access for settings (will restrict later with auth)
CREATE POLICY "Allow public read on settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on settings" ON public.settings FOR UPDATE USING (true);

-- Insert default settings
INSERT INTO public.settings (id, monthly_fee, fiscal_year_start_month, whatsapp_message_template)
VALUES ('default', 50.00, 7, 'Estimado hermano, le recordamos que tiene un saldo pendiente de ${monto}. Agradecemos su pronta atención.')
ON CONFLICT (id) DO NOTHING;

-- Add trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();