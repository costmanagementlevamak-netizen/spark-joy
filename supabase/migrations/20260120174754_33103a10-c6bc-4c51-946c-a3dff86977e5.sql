-- Add treasury_amount field to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS treasury_amount NUMERIC DEFAULT 50.00;

-- Create monthly_payments table for treasury
CREATE TABLE IF NOT EXISTS public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  receipt_url TEXT,
  is_quick_pay BOOLEAN DEFAULT false,
  quick_pay_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, year)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT 'otros',
  date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  monthly_fee NUMERIC DEFAULT 50.00,
  fiscal_year_start_month INTEGER DEFAULT 7,
  whatsapp_message_template TEXT,
  monthly_report_template TEXT DEFAULT 'Este informe presenta el resumen financiero correspondiente al período indicado.',
  annual_report_template TEXT DEFAULT 'Este informe presenta el resumen financiero anual consolidado del período fiscal.',
  institution_name TEXT DEFAULT 'Logia',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings if not exists
INSERT INTO public.settings (id, monthly_fee, fiscal_year_start_month, monthly_report_template, annual_report_template)
VALUES ('default', 50.00, 7, 'Este informe presenta el resumen financiero correspondiente al período indicado.', 'Este informe presenta el resumen financiero anual consolidado del período fiscal.')
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for receipts if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust when auth is added)
CREATE POLICY "Allow all access to monthly_payments" ON public.monthly_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Storage policies for receipts bucket
CREATE POLICY "Public read access for receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Allow upload to receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Allow update receipts" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');
CREATE POLICY "Allow delete receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_payments_member_id ON public.monthly_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_year_month ON public.monthly_payments(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_quick_pay ON public.monthly_payments(quick_pay_group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_monthly_payments_updated_at BEFORE UPDATE ON public.monthly_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();