-- Create enums
CREATE TYPE public.masonic_degree AS ENUM ('aprendiz', 'companero', 'maestro');

CREATE TYPE public.member_status AS ENUM ('activo', 'cese', 'quite', 'licencia', 'irradiacion', 'expulsion', 'ad_vitam');

CREATE TYPE public.payment_status AS ENUM ('pendiente', 'completado', 'cancelado');

CREATE TYPE public.payment_category AS ENUM ('alimentacion', 'alquiler', 'servicios_basicos', 'articulos_activos', 'membresia', 'filantropia', 'eventos', 'otros');

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree public.masonic_degree NOT NULL DEFAULT 'aprendiz',
  phone TEXT,
  cedula TEXT,
  address TEXT,
  status public.member_status DEFAULT 'activo',
  birth_date DATE NOT NULL,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  status public.payment_status DEFAULT 'pendiente',
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, year)
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category public.payment_category NOT NULL DEFAULT 'otros',
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extraordinary_income table
CREATE TABLE public.extraordinary_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category public.payment_category NOT NULL DEFAULT 'otros',
  amount_per_member NUMERIC(10,2) NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extraordinary_payments table
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_id UUID NOT NULL REFERENCES public.extraordinary_income(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(income_id, member_id)
);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin access for now)
CREATE POLICY "Authenticated users can view members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view payments" ON public.monthly_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payments" ON public.monthly_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payments" ON public.monthly_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete payments" ON public.monthly_payments FOR DELETE TO authenticated USING (true);

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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for all tables
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_payments_updated_at BEFORE UPDATE ON public.monthly_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_income_updated_at BEFORE UPDATE ON public.extraordinary_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_payments_updated_at BEFORE UPDATE ON public.extraordinary_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_monthly_payments_member_id ON public.monthly_payments(member_id);
CREATE INDEX idx_monthly_payments_year ON public.monthly_payments(year);
CREATE INDEX idx_expenses_is_paid ON public.expenses(is_paid);
CREATE INDEX idx_extraordinary_payments_income_id ON public.extraordinary_payments(income_id);
CREATE INDEX idx_extraordinary_payments_member_id ON public.extraordinary_payments(member_id);