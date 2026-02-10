
-- Members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT DEFAULT 'aprendiz',
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'activo',
  treasury_amount NUMERIC DEFAULT 50,
  is_treasurer BOOLEAN DEFAULT false,
  cedula TEXT,
  address TEXT,
  join_date DATE,
  birth_date DATE,
  cargo_logial TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT DEFAULT 'Logia',
  monthly_fee_base NUMERIC DEFAULT 50,
  monthly_report_template TEXT DEFAULT '',
  annual_report_template TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'paid',
  receipt_url TEXT,
  payment_type TEXT DEFAULT 'regular',
  quick_pay_group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT 'otros',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  date DATE,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extraordinary fees table
CREATE TABLE public.extraordinary_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member NUMERIC NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'otro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extraordinary payments table
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extraordinary_fee_id UUID NOT NULL REFERENCES public.extraordinary_fees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Degree fees table
CREATE TABLE public.degree_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  fee_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.degree_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can CRUD all data
CREATE POLICY "Authenticated users can read members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON public.settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read monthly_payments" ON public.monthly_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert monthly_payments" ON public.monthly_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update monthly_payments" ON public.monthly_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete monthly_payments" ON public.monthly_payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read extraordinary_fees" ON public.extraordinary_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraordinary_fees" ON public.extraordinary_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extraordinary_fees" ON public.extraordinary_fees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extraordinary_fees" ON public.extraordinary_fees FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read extraordinary_payments" ON public.extraordinary_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraordinary_payments" ON public.extraordinary_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extraordinary_payments" ON public.extraordinary_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extraordinary_payments" ON public.extraordinary_payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read degree_fees" ON public.degree_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert degree_fees" ON public.degree_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update degree_fees" ON public.degree_fees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete degree_fees" ON public.degree_fees FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Anyone can view receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
