-- Create enum for masonic rites
CREATE TYPE public.masonic_rite AS ENUM (
  'escoces_antiguo_aceptado',
  'antiguo_gremio',
  'emulacion',
  'york',
  'memphis'
);

-- Create enum for masonic degrees
CREATE TYPE public.masonic_degree AS ENUM (
  'aprendiz',
  'companero',
  'maestro'
);

-- Create enum for member status
CREATE TYPE public.member_status AS ENUM (
  'activo',
  'cese',
  'quite',
  'licencia',
  'irradiacion',
  'expulsion',
  'ad_vitam'
);

-- Create enum for payment categories
CREATE TYPE public.payment_category AS ENUM (
  'alimentacion',
  'alquiler',
  'servicios_basicos',
  'articulos_activos',
  'membresia',
  'otros',
  'filantropia',
  'eventos'
);

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM (
  'completado',
  'parcial',
  'pendiente'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  rite masonic_rite NOT NULL,
  is_treasurer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  degree masonic_degree NOT NULL,
  cedula TEXT,
  address TEXT,
  phone TEXT,
  admission_date DATE NOT NULL,
  birth_date DATE NOT NULL,
  status member_status DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Members policies
CREATE POLICY "Authenticated users can view members"
  ON public.members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON public.members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete members"
  ON public.members FOR DELETE
  TO authenticated
  USING (true);

-- Create monthly_payments table
CREATE TABLE public.monthly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  receipt_url TEXT,
  status payment_status DEFAULT 'pendiente',
  is_bonus BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, month, year)
);

-- Enable RLS on monthly_payments
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON public.monthly_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage payments"
  ON public.monthly_payments FOR ALL
  TO authenticated
  USING (true);

-- Create extraordinary_income table
CREATE TABLE public.extraordinary_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category payment_category NOT NULL,
  amount_per_member DECIMAL(10,2) NOT NULL,
  due_date DATE,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on extraordinary_income
ALTER TABLE public.extraordinary_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view extraordinary income"
  ON public.extraordinary_income FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage extraordinary income"
  ON public.extraordinary_income FOR ALL
  TO authenticated
  USING (true);

-- Create extraordinary_payments table
CREATE TABLE public.extraordinary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id UUID REFERENCES public.extraordinary_income(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(income_id, member_id)
);

-- Enable RLS on extraordinary_payments
ALTER TABLE public.extraordinary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage extraordinary payments"
  ON public.extraordinary_payments FOR ALL
  TO authenticated
  USING (true);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category payment_category NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  receipt_url TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (true);

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, rite)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'rite')::masonic_rite, 'escoces_antiguo_aceptado')
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_payments_updated_at
  BEFORE UPDATE ON public.monthly_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extraordinary_income_updated_at
  BEFORE UPDATE ON public.extraordinary_income
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extraordinary_payments_updated_at
  BEFORE UPDATE ON public.extraordinary_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();