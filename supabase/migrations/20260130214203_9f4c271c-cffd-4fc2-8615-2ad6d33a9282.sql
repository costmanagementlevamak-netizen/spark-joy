-- Create settings table
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  institution_name TEXT DEFAULT 'Logia',
  monthly_fee NUMERIC(10,2) DEFAULT 50.00,
  monthly_report_template TEXT,
  annual_report_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT DEFAULT 'aprendiz',
  status TEXT DEFAULT 'activo',
  is_treasurer BOOLEAN DEFAULT false,
  treasury_amount NUMERIC(10,2) DEFAULT 50.00,
  email TEXT,
  phone TEXT,
  cedula TEXT,
  address TEXT,
  join_date DATE,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
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
  amount NUMERIC(10,2) NOT NULL,
  category TEXT,
  date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extraordinary_income table
CREATE TABLE public.extraordinary_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member NUMERIC(10,2) NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extraordinary_payments table
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_id UUID REFERENCES public.extraordinary_income(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(income_id, member_id)
);

-- Enable RLS on all tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
-- Settings policies
CREATE POLICY "Allow authenticated users to read settings" 
ON public.settings FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert settings" 
ON public.settings FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update settings" 
ON public.settings FOR UPDATE 
TO authenticated
USING (true);

-- Members policies
CREATE POLICY "Allow authenticated users to read members" 
ON public.members FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert members" 
ON public.members FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update members" 
ON public.members FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete members" 
ON public.members FOR DELETE 
TO authenticated
USING (true);

-- Monthly payments policies
CREATE POLICY "Allow authenticated users to read monthly_payments" 
ON public.monthly_payments FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert monthly_payments" 
ON public.monthly_payments FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update monthly_payments" 
ON public.monthly_payments FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete monthly_payments" 
ON public.monthly_payments FOR DELETE 
TO authenticated
USING (true);

-- Expenses policies
CREATE POLICY "Allow authenticated users to read expenses" 
ON public.expenses FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert expenses" 
ON public.expenses FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update expenses" 
ON public.expenses FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete expenses" 
ON public.expenses FOR DELETE 
TO authenticated
USING (true);

-- Extraordinary income policies
CREATE POLICY "Allow authenticated users to read extraordinary_income" 
ON public.extraordinary_income FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert extraordinary_income" 
ON public.extraordinary_income FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update extraordinary_income" 
ON public.extraordinary_income FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete extraordinary_income" 
ON public.extraordinary_income FOR DELETE 
TO authenticated
USING (true);

-- Extraordinary payments policies
CREATE POLICY "Allow authenticated users to read extraordinary_payments" 
ON public.extraordinary_payments FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert extraordinary_payments" 
ON public.extraordinary_payments FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update extraordinary_payments" 
ON public.extraordinary_payments FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete extraordinary_payments" 
ON public.extraordinary_payments FOR DELETE 
TO authenticated
USING (true);

-- Insert default settings
INSERT INTO public.settings (id, institution_name, monthly_fee) 
VALUES ('default', 'Logia', 50.00)
ON CONFLICT (id) DO NOTHING;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();