-- Create payment_category enum
CREATE TYPE public.payment_category AS ENUM ('cuotas', 'multas', 'donaciones', 'eventos', 'otros');

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT,
  status TEXT DEFAULT 'activo',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for members (authenticated users can read/write)
CREATE POLICY "Authenticated users can view members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE TO authenticated USING (true);

-- Create extraordinary_income table
CREATE TABLE public.extraordinary_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member NUMERIC NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT true,
  category public.payment_category NOT NULL DEFAULT 'otros',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on extraordinary_income
ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for extraordinary_income
CREATE POLICY "Authenticated users can view extraordinary_income" ON public.extraordinary_income FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraordinary_income" ON public.extraordinary_income FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extraordinary_income" ON public.extraordinary_income FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extraordinary_income" ON public.extraordinary_income FOR DELETE TO authenticated USING (true);

-- Create extraordinary_payments table
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_id UUID NOT NULL REFERENCES public.extraordinary_income(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on extraordinary_payments
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for extraordinary_payments
CREATE POLICY "Authenticated users can view extraordinary_payments" ON public.extraordinary_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraordinary_payments" ON public.extraordinary_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extraordinary_payments" ON public.extraordinary_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extraordinary_payments" ON public.extraordinary_payments FOR DELETE TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_income_updated_at BEFORE UPDATE ON public.extraordinary_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_payments_updated_at BEFORE UPDATE ON public.extraordinary_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();