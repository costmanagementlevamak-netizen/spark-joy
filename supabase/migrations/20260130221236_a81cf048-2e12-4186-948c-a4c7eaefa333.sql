-- =============================================
-- TABLA DE CONFIGURACIÓN GENERAL (Singleton)
-- =============================================
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  institution_name TEXT NOT NULL DEFAULT 'Logia',
  monthly_fee_base DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  monthly_report_template TEXT,
  annual_report_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO public.settings (id) VALUES ('default');

-- =============================================
-- TABLA DE MIEMBROS
-- =============================================
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  degree TEXT CHECK (degree IN ('aprendiz', 'companero', 'maestro')),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo', 'licencia', 'ad_vitam', 'suspendido')),
  is_treasurer BOOLEAN NOT NULL DEFAULT false,
  treasury_amount DECIMAL(10,2) DEFAULT 50.00,
  email TEXT,
  phone TEXT,
  cedula TEXT UNIQUE,
  address TEXT,
  join_date DATE,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda de cumpleaños (día y mes)
CREATE INDEX idx_members_birthday ON public.members (
  EXTRACT(MONTH FROM birth_date),
  EXTRACT(DAY FROM birth_date)
);

-- Índice para búsqueda por estado
CREATE INDEX idx_members_status ON public.members (status);

-- =============================================
-- TABLA DE PAGOS MENSUALES (TESORERÍA)
-- =============================================
CREATE TABLE public.monthly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  amount DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_url TEXT,
  payment_type TEXT NOT NULL DEFAULT 'regular' CHECK (payment_type IN ('regular', 'adelantado', 'pronto_pago', 'pp')),
  quick_pay_group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, month, year)
);

-- Índices para consultas frecuentes
CREATE INDEX idx_monthly_payments_member ON public.monthly_payments (member_id);
CREATE INDEX idx_monthly_payments_period ON public.monthly_payments (year, month);
CREATE INDEX idx_monthly_payments_quick_pay ON public.monthly_payments (quick_pay_group_id) WHERE quick_pay_group_id IS NOT NULL;

-- =============================================
-- TABLA DE INGRESOS EXTRAORDINARIOS
-- =============================================
CREATE TABLE public.extraordinary_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  amount_per_member DECIMAL(10,2) NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLA DE PAGOS DE CUOTAS EXTRAORDINARIAS
-- =============================================
CREATE TABLE public.extraordinary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraordinary_fee_id UUID NOT NULL REFERENCES public.extraordinary_fees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (extraordinary_fee_id, member_id)
);

-- Índices
CREATE INDEX idx_extraordinary_payments_fee ON public.extraordinary_payments (extraordinary_fee_id);
CREATE INDEX idx_extraordinary_payments_member ON public.extraordinary_payments (member_id);

-- =============================================
-- TABLA DE GASTOS
-- =============================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category TEXT,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consultas por fecha
CREATE INDEX idx_expenses_date ON public.expenses (expense_date);
CREATE INDEX idx_expenses_category ON public.expenses (category) WHERE category IS NOT NULL;

-- =============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extraordinary_fees_updated_at
  BEFORE UPDATE ON public.extraordinary_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCIÓN: Asegurar solo un tesorero activo
-- =============================================
CREATE OR REPLACE FUNCTION public.ensure_single_treasurer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_treasurer = true THEN
    UPDATE public.members 
    SET is_treasurer = false 
    WHERE id != NEW.id AND is_treasurer = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER ensure_single_treasurer_trigger
  BEFORE INSERT OR UPDATE OF is_treasurer ON public.members
  FOR EACH ROW
  WHEN (NEW.is_treasurer = true)
  EXECUTE FUNCTION public.ensure_single_treasurer();

-- =============================================
-- FUNCIÓN: Establecer cuota por defecto desde settings
-- =============================================
CREATE OR REPLACE FUNCTION public.set_default_treasury_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.treasury_amount IS NULL THEN
    SELECT monthly_fee_base INTO NEW.treasury_amount 
    FROM public.settings 
    WHERE id = 'default';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_member_default_fee
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_default_treasury_amount();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados
CREATE POLICY "Authenticated users can read settings"
  ON public.settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON public.settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage members"
  ON public.members FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage monthly_payments"
  ON public.monthly_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage extraordinary_fees"
  ON public.extraordinary_fees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage extraordinary_payments"
  ON public.extraordinary_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage expenses"
  ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);