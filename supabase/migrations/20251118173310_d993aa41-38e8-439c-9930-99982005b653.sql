-- Fix security warnings by setting search_path on functions

-- Update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update the create_monthly_payments_for_member function
CREATE OR REPLACE FUNCTION public.create_monthly_payments_for_member()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;