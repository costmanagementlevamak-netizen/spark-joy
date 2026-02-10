
-- ==========================================
-- MEMBERS TABLE
-- ==========================================
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  degree TEXT DEFAULT 'aprendiz',
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'activo',
  treasury_amount NUMERIC DEFAULT 0,
  is_treasurer BOOLEAN DEFAULT false,
  cedula TEXT,
  address TEXT,
  join_date DATE,
  birth_date DATE,
  cargo_logial TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to members" ON public.members FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- SETTINGS TABLE
-- ==========================================
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT DEFAULT 'Logia',
  monthly_fee_base NUMERIC DEFAULT 50,
  monthly_report_template TEXT DEFAULT 'Este informe presenta el resumen financiero correspondiente al período indicado, con datos reales registrados en el sistema de tesorería.',
  annual_report_template TEXT DEFAULT 'Este informe presenta el resumen financiero anual consolidado del período fiscal, incluyendo el detalle de ingresos, egresos y balance general.',
  logo_url TEXT,
  treasurer_id UUID REFERENCES public.members(id),
  treasurer_signature_url TEXT,
  vm_signature_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- MONTHLY PAYMENTS TABLE
-- ==========================================
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_at DATE,
  status TEXT,
  receipt_url TEXT,
  quick_pay_group_id UUID,
  payment_type TEXT DEFAULT 'regular',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, month, year)
);

ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to monthly_payments" ON public.monthly_payments FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- EXTRAORDINARY FEES TABLE
-- ==========================================
CREATE TABLE public.extraordinary_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.extraordinary_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to extraordinary_fees" ON public.extraordinary_fees FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- EXTRAORDINARY PAYMENTS TABLE
-- ==========================================
CREATE TABLE public.extraordinary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extraordinary_fee_id UUID NOT NULL REFERENCES public.extraordinary_fees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to extraordinary_payments" ON public.extraordinary_payments FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- DEGREE FEES TABLE
-- ==========================================
CREATE TABLE public.degree_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  fee_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'iniciacion',
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.degree_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to degree_fees" ON public.degree_fees FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- EXPENSES TABLE
-- ==========================================
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  expense_date DATE NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- RECEIPT SEQUENCES TABLE
-- ==========================================
CREATE TABLE public.receipt_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL UNIQUE,
  last_number INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to receipt_sequences" ON public.receipt_sequences FOR ALL USING (true) WITH CHECK (true);

-- Insert default sequences
INSERT INTO public.receipt_sequences (module, last_number) VALUES
  ('treasury', 0),
  ('extraordinary', 0),
  ('degree', 0);

-- ==========================================
-- RECEIPT NUMBER FUNCTION
-- ==========================================
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
  UPDATE receipt_sequences SET last_number = last_number + 1 WHERE module = p_module RETURNING last_number INTO v_next;
  
  IF v_next IS NULL THEN
    INSERT INTO receipt_sequences (module, last_number) VALUES (p_module, 1) RETURNING last_number INTO v_next;
  END IF;
  
  CASE p_module
    WHEN 'treasury' THEN v_prefix := 'TSR';
    WHEN 'extraordinary' THEN v_prefix := 'EXT';
    WHEN 'degree' THEN v_prefix := 'DG';
    ELSE v_prefix := 'REC';
  END CASE;
  
  RETURN v_prefix || LPAD(v_next::TEXT, 7, '0');
END;
$$;

-- ==========================================
-- STORAGE BUCKET FOR RECEIPTS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

CREATE POLICY "Public read access for receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Allow uploads to receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Allow updates to receipts" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');

-- ==========================================
-- UPDATED_AT TRIGGER
-- ==========================================
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
CREATE TRIGGER update_extraordinary_fees_updated_at BEFORE UPDATE ON public.extraordinary_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extraordinary_payments_updated_at BEFORE UPDATE ON public.extraordinary_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_degree_fees_updated_at BEFORE UPDATE ON public.degree_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
