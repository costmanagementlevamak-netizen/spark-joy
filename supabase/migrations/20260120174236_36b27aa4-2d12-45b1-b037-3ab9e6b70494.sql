-- Create payment_category enum
CREATE TYPE public.payment_category AS ENUM ('mensualidad', 'extraordinaria', 'multa', 'otros');

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth needs)
CREATE POLICY "Allow all access to members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to extraordinary_income" ON public.extraordinary_income FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to extraordinary_payments" ON public.extraordinary_payments FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_extraordinary_payments_income_id ON public.extraordinary_payments(income_id);
CREATE INDEX idx_extraordinary_payments_member_id ON public.extraordinary_payments(member_id);
CREATE INDEX idx_members_status ON public.members(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_income_updated_at BEFORE UPDATE ON public.extraordinary_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_payments_updated_at BEFORE UPDATE ON public.extraordinary_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();