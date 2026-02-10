
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Function to auto-assign role on signup
-- First user = admin, subsequent = user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  assigned_role app_role;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  -- If this is the first user (count=1 because trigger fires after insert), make admin
  IF user_count <= 1 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'user';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;

-- 6. Trigger to auto-assign role
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Create degree_fees table for Derechos de Grado module
CREATE TABLE public.degree_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  fee_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.degree_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read degree_fees"
  ON public.degree_fees FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert degree_fees"
  ON public.degree_fees FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update degree_fees"
  ON public.degree_fees FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete degree_fees"
  ON public.degree_fees FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 8. Add logo_url and period fields to settings
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS period_start_month INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS period_start_year INTEGER DEFAULT 2025,
  ADD COLUMN IF NOT EXISTS initial_balance NUMERIC DEFAULT 0;

-- 9. Add period_closures table for tracking treasurer changes
CREATE TABLE public.period_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_treasurer_id UUID REFERENCES public.members(id),
  new_treasurer_id UUID REFERENCES public.members(id),
  closure_date DATE NOT NULL DEFAULT CURRENT_DATE,
  final_balance NUMERIC NOT NULL DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.period_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read period_closures"
  ON public.period_closures FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert period_closures"
  ON public.period_closures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
