-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE NOT NULL,
  degree TEXT NOT NULL CHECK (degree IN ('aprendiz', 'companero', 'maestro')),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'cese', 'quite', 'licencia', 'irradiacion', 'expulsion', 'ad_vitam')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('completado', 'parcial', 'pendiente')),
  receipt_url TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, year)
);

-- Create extraordinary_fees table (renamed from extraordinary_income)
CREATE TABLE public.extraordinary_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  amount_per_member DECIMAL(10,2) NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extraordinary_fee_payments table
CREATE TABLE public.extraordinary_fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_id UUID NOT NULL REFERENCES public.extraordinary_fees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pagado', 'pendiente')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fee_id, member_id)
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now - should add auth later)
CREATE POLICY "Allow all operations on members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on monthly_payments" ON public.monthly_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on extraordinary_fees" ON public.extraordinary_fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on extraordinary_fee_payments" ON public.extraordinary_fee_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_payments_updated_at
  BEFORE UPDATE ON public.monthly_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extraordinary_fees_updated_at
  BEFORE UPDATE ON public.extraordinary_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create monthly payment records for new members
CREATE OR REPLACE FUNCTION public.create_monthly_payments_for_member()
RETURNS TRIGGER AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Create 12 monthly payment records for the current year
  FOR i IN 1..12 LOOP
    INSERT INTO public.monthly_payments (member_id, month, year, amount, status)
    VALUES (NEW.id, i, current_year, 0.00, 'pendiente');
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create monthly payments when a member is added
CREATE TRIGGER on_member_created
  AFTER INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.create_monthly_payments_for_member();

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true);

-- Create storage policies for receipts
CREATE POLICY "Allow public read access to receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "Allow public upload to receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Allow public update to receipts"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts');