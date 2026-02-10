-- Add missing columns to members table (name and grade)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS grade TEXT;

-- Update existing data: copy full_name to name if name is null
UPDATE public.members SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE public.members SET grade = degree WHERE grade IS NULL AND degree IS NOT NULL;

-- Make name not null after populating
ALTER TABLE public.members ALTER COLUMN name SET NOT NULL;

-- Create monthly_payments table
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at DATE,
  status TEXT DEFAULT 'pending',
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, year)
);

-- Enable RLS on monthly_payments
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for monthly_payments
CREATE POLICY "Authenticated users can view monthly_payments" ON public.monthly_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert monthly_payments" ON public.monthly_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update monthly_payments" ON public.monthly_payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete monthly_payments" ON public.monthly_payments FOR DELETE TO authenticated USING (true);

-- Create expenses table
CREATE TABLE public.expenses (
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

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expenses
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

-- Create extraordinary_fees table (used by Dashboard and Reports)
CREATE TABLE public.extraordinary_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'income', -- 'income' or 'expense'
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'pagado'
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on extraordinary_fees
ALTER TABLE public.extraordinary_fees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for extraordinary_fees
CREATE POLICY "Authenticated users can view extraordinary_fees" ON public.extraordinary_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraordinary_fees" ON public.extraordinary_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extraordinary_fees" ON public.extraordinary_fees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extraordinary_fees" ON public.extraordinary_fees FOR DELETE TO authenticated USING (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_monthly_payments_updated_at BEFORE UPDATE ON public.monthly_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_fees_updated_at BEFORE UPDATE ON public.extraordinary_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts bucket
CREATE POLICY "Anyone can view receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Authenticated users can update receipts" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'receipts');
CREATE POLICY "Authenticated users can delete receipts" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'receipts');