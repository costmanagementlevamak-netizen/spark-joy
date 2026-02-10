-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT,
  status TEXT DEFAULT 'activo',
  is_treasurer BOOLEAN DEFAULT false,
  treasury_amount NUMERIC DEFAULT 0,
  email TEXT,
  phone TEXT,
  cedula TEXT,
  address TEXT,
  join_date DATE,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  receipt_url TEXT,
  is_quick_pay BOOLEAN DEFAULT false,
  quick_pay_group_id TEXT,
  payment_type TEXT DEFAULT 'regular',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, year)
);

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

-- Create extraordinary_income table
CREATE TABLE public.extraordinary_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member NUMERIC NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Create settings table
CREATE TABLE public.settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  institution_name TEXT DEFAULT 'Logia',
  monthly_fee NUMERIC DEFAULT 50,
  monthly_report_template TEXT,
  annual_report_template TEXT
);

-- Insert default settings
INSERT INTO public.settings (id, institution_name, monthly_fee) 
VALUES ('default', 'Logia', 50);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (allow all operations)
CREATE POLICY "Authenticated users can view members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view monthly_payments" ON public.monthly_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert monthly_payments" ON public.monthly_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update monthly_payments" ON public.monthly_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete monthly_payments" ON public.monthly_payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view extraordinary_income" ON public.extraordinary_income FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraordinary_income" ON public.extraordinary_income FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extraordinary_income" ON public.extraordinary_income FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extraordinary_income" ON public.extraordinary_income FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view extraordinary_payments" ON public.extraordinary_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraordinary_payments" ON public.extraordinary_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extraordinary_payments" ON public.extraordinary_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extraordinary_payments" ON public.extraordinary_payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON public.settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete settings" ON public.settings FOR DELETE TO authenticated USING (true);