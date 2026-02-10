-- Create payment_category enum
CREATE TYPE public.payment_category AS ENUM ('mensualidad', 'cuota_especial', 'donacion', 'evento', 'otros');

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  degree TEXT DEFAULT 'aprendiz',
  status TEXT DEFAULT 'activo',
  treasury_amount NUMERIC DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on members"
ON public.members FOR ALL
USING (true)
WITH CHECK (true);

-- Create settings table
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  institution_name TEXT DEFAULT 'Logia',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on settings"
ON public.settings FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.settings (id, institution_name) VALUES ('default', 'Logia');

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on expenses"
ON public.expenses FOR ALL
USING (true)
WITH CHECK (true);

-- Create monthly_payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at DATE,
  status TEXT DEFAULT 'pending',
  receipt_url TEXT,
  is_quick_pay BOOLEAN DEFAULT false,
  quick_pay_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (member_id, month, year)
);

ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on monthly_payments"
ON public.monthly_payments FOR ALL
USING (true)
WITH CHECK (true);

-- Create extraordinary_income table
CREATE TABLE public.extraordinary_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member NUMERIC NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT true,
  category public.payment_category DEFAULT 'otros',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on extraordinary_income"
ON public.extraordinary_income FOR ALL
USING (true)
WITH CHECK (true);

-- Create extraordinary_payments table
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_id UUID NOT NULL REFERENCES public.extraordinary_income(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on extraordinary_payments"
ON public.extraordinary_payments FOR ALL
USING (true)
WITH CHECK (true);

-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies for receipts bucket
CREATE POLICY "Public read access for receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Allow upload to receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Allow update receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts');

CREATE POLICY "Allow delete receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts');