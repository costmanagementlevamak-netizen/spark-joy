
-- Add missing columns to degree_fees
ALTER TABLE public.degree_fees ADD COLUMN IF NOT EXISTS fee_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.degree_fees ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.degree_fees ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.degree_fees ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Receipt number function
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_module TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
BEGIN
  CASE p_module
    WHEN 'treasury' THEN prefix := 'TSR';
    WHEN 'extraordinary' THEN prefix := 'EXT';
    WHEN 'degree' THEN prefix := 'GRD';
    ELSE prefix := 'REC';
  END CASE;
  
  next_num := COALESCE(
    (SELECT COUNT(*) + 1 FROM (
      SELECT 1 FROM monthly_payments WHERE receipt_url IS NOT NULL
      UNION ALL SELECT 1 FROM extraordinary_payments WHERE receipt_url IS NOT NULL
      UNION ALL SELECT 1 FROM degree_fees WHERE receipt_url IS NOT NULL
    ) sub),
    1
  );
  
  RETURN prefix || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;
