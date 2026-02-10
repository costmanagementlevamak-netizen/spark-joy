-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT DEFAULT 'aprendiz',
  status TEXT DEFAULT 'activo',
  is_treasurer BOOLEAN DEFAULT false,
  treasury_amount NUMERIC DEFAULT 50,
  email TEXT,
  phone TEXT,
  cedula TEXT,
  address TEXT,
  join_date DATE,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_payments table with payment_type for P.P (pronto pago benefit)
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at DATE,
  receipt_url TEXT,
  is_quick_pay BOOLEAN DEFAULT false,
  quick_pay_group_id UUID,
  payment_type TEXT DEFAULT 'regular', -- 'regular' or 'pronto_pago_benefit' (P.P)
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
  annual_report_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.settings (id, institution_name, monthly_fee) 
VALUES ('default', 'Logia', 50);

-- Create birthday_notifications table for tracking sent birthday messages
CREATE TABLE public.birthday_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  notification_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, notification_date)
);

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_notifications ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all authenticated users (since this is a single-tenant app)
-- Members policies
CREATE POLICY "Allow all operations on members" ON public.members FOR ALL USING (true) WITH CHECK (true);

-- Monthly payments policies
CREATE POLICY "Allow all operations on monthly_payments" ON public.monthly_payments FOR ALL USING (true) WITH CHECK (true);

-- Expenses policies
CREATE POLICY "Allow all operations on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Extraordinary income policies
CREATE POLICY "Allow all operations on extraordinary_income" ON public.extraordinary_income FOR ALL USING (true) WITH CHECK (true);

-- Extraordinary payments policies
CREATE POLICY "Allow all operations on extraordinary_payments" ON public.extraordinary_payments FOR ALL USING (true) WITH CHECK (true);

-- Settings policies
CREATE POLICY "Allow all operations on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Birthday notifications policies
CREATE POLICY "Allow all operations on birthday_notifications" ON public.birthday_notifications FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies for receipts
CREATE POLICY "Allow public read on receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Allow public upload on receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Allow public update on receipts" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');
CREATE POLICY "Allow public delete on receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');