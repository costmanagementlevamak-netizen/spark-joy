
-- =============================================
-- 1. MEMBERS TABLE
-- =============================================
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  cedula TEXT,
  degree TEXT DEFAULT 'aprendiz',
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'activo',
  address TEXT,
  join_date DATE,
  birth_date DATE,
  cargo_logial TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  is_treasurer BOOLEAN DEFAULT false,
  treasury_amount NUMERIC(10,2) DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view members" ON public.members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 2. SETTINGS TABLE
-- =============================================
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT DEFAULT 'Logia',
  monthly_fee_base NUMERIC(10,2) DEFAULT 50,
  monthly_report_template TEXT,
  annual_report_template TEXT,
  logo_url TEXT,
  treasurer_id UUID,
  treasurer_signature_url TEXT,
  vm_signature_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view settings" ON public.settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update settings" ON public.settings FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 3. MONTHLY PAYMENTS TABLE
-- =============================================
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_at DATE,
  status TEXT DEFAULT 'pending',
  receipt_url TEXT,
  quick_pay_group_id UUID,
  payment_type TEXT DEFAULT 'regular',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, year)
);
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view monthly_payments" ON public.monthly_payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert monthly_payments" ON public.monthly_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update monthly_payments" ON public.monthly_payments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete monthly_payments" ON public.monthly_payments FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 4. EXPENSES TABLE
-- =============================================
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT DEFAULT 'otros',
  expense_date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update expenses" ON public.expenses FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete expenses" ON public.expenses FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 5. EXTRAORDINARY FEES TABLE
-- =============================================
CREATE TABLE public.extraordinary_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member NUMERIC(10,2) NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'otro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.extraordinary_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view extraordinary_fees" ON public.extraordinary_fees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert extraordinary_fees" ON public.extraordinary_fees FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update extraordinary_fees" ON public.extraordinary_fees FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete extraordinary_fees" ON public.extraordinary_fees FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 6. EXTRAORDINARY PAYMENTS TABLE
-- =============================================
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extraordinary_fee_id UUID NOT NULL REFERENCES public.extraordinary_fees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view extraordinary_payments" ON public.extraordinary_payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert extraordinary_payments" ON public.extraordinary_payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update extraordinary_payments" ON public.extraordinary_payments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete extraordinary_payments" ON public.extraordinary_payments FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 7. DEGREE FEES TABLE
-- =============================================
CREATE TABLE public.degree_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'iniciacion',
  fee_date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.degree_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view degree_fees" ON public.degree_fees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert degree_fees" ON public.degree_fees FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update degree_fees" ON public.degree_fees FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete degree_fees" ON public.degree_fees FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- 8. RECEIPT SEQUENCES TABLE (for sequential numbering)
-- =============================================
CREATE TABLE public.receipt_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL UNIQUE,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view receipt_sequences" ON public.receipt_sequences FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert receipt_sequences" ON public.receipt_sequences FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update receipt_sequences" ON public.receipt_sequences FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Seed the sequences
INSERT INTO public.receipt_sequences (module, last_number) VALUES ('treasury', 0), ('extraordinary', 0), ('degree', 0);

-- =============================================
-- 9. FUNCTION: get_next_receipt_number
-- =============================================
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_module TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
  v_prefix TEXT;
BEGIN
  -- Get prefix
  IF p_module = 'treasury' THEN v_prefix := 'TSR';
  ELSIF p_module = 'extraordinary' THEN v_prefix := 'EXT';
  ELSIF p_module = 'degree' THEN v_prefix := 'GRD';
  ELSE v_prefix := 'REC';
  END IF;

  -- Atomically increment
  UPDATE public.receipt_sequences
  SET last_number = last_number + 1, updated_at = now()
  WHERE module = p_module
  RETURNING last_number INTO v_next;

  -- If no row, insert
  IF v_next IS NULL THEN
    INSERT INTO public.receipt_sequences (module, last_number)
    VALUES (p_module, 1)
    ON CONFLICT (module) DO UPDATE SET last_number = receipt_sequences.last_number + 1
    RETURNING last_number INTO v_next;
  END IF;

  RETURN v_prefix || LPAD(v_next::TEXT, 7, '0');
END;
$$;

-- =============================================
-- 10. STORAGE BUCKET for receipts
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Authenticated users can update receipts" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

-- =============================================
-- 11. UPDATE TRIGGER for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_payments_updated_at BEFORE UPDATE ON public.monthly_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_fees_updated_at BEFORE UPDATE ON public.extraordinary_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_payments_updated_at BEFORE UPDATE ON public.extraordinary_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_degree_fees_updated_at BEFORE UPDATE ON public.degree_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
