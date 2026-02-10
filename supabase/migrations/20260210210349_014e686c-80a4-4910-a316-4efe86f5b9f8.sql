
-- Members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT NULL,
  status TEXT NULL DEFAULT 'activo',
  is_treasurer BOOLEAN NULL DEFAULT false,
  treasury_amount NUMERIC NULL DEFAULT 0,
  cargo_logial TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  cedula TEXT NULL,
  address TEXT NULL,
  join_date TEXT NULL,
  birth_date TEXT NULL,
  emergency_contact_name TEXT NULL,
  emergency_contact_phone TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TEXT NULL,
  payment_type TEXT NULL DEFAULT 'regular',
  quick_pay_group_id TEXT NULL,
  receipt_url TEXT NULL,
  status TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NULL,
  expense_date TEXT NOT NULL,
  notes TEXT NULL,
  receipt_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extraordinary fees table
CREATE TABLE public.extraordinary_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NULL,
  amount_per_member NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT NULL,
  is_mandatory BOOLEAN NULL DEFAULT true,
  category TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extraordinary payments table
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extraordinary_fee_id UUID NOT NULL REFERENCES public.extraordinary_fees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_date TEXT NULL,
  receipt_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Degree fees table
CREATE TABLE public.degree_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'grado',
  fee_date TEXT NOT NULL,
  notes TEXT NULL,
  receipt_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT NULL DEFAULT 'Logia',
  monthly_fee_base NUMERIC NULL DEFAULT 50,
  monthly_report_template TEXT NULL,
  annual_report_template TEXT NULL,
  logo_url TEXT NULL,
  treasurer_id UUID NULL REFERENCES public.members(id),
  treasurer_signature_url TEXT NULL,
  vm_signature_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receipt sequences table
CREATE TABLE public.receipt_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL UNIQUE,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Function to get next receipt number
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_module TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO receipt_sequences (module, last_number)
  VALUES (p_module, 1)
  ON CONFLICT (module) DO UPDATE SET last_number = receipt_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN LPAD(v_next::TEXT, 6, '0');
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.degree_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can do everything (this is an internal app)
CREATE POLICY "Authenticated users full access" ON public.members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.monthly_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.extraordinary_fees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.extraordinary_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.degree_fees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.receipt_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon read for settings (needed before login)
CREATE POLICY "Anon read settings" ON public.settings FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read receipt_sequences" ON public.receipt_sequences FOR SELECT TO anon USING (true);
