-- Add new fields to members table for complete member registration
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS cedula text,
ADD COLUMN IF NOT EXISTS direccion text,
ADD COLUMN IF NOT EXISTS fecha_ingreso date,
ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
ADD COLUMN IF NOT EXISTS is_treasurer boolean DEFAULT false;

-- Create a function to ensure only one treasurer exists
CREATE OR REPLACE FUNCTION public.ensure_single_treasurer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_treasurer = true THEN
    -- Check if another treasurer exists (excluding current record on update)
    IF EXISTS (
      SELECT 1 FROM public.members 
      WHERE is_treasurer = true 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'activo'
    ) THEN
      RAISE EXCEPTION 'Ya existe un tesorero activo. Solo puede haber un tesorero a la vez.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to enforce single treasurer
DROP TRIGGER IF EXISTS enforce_single_treasurer ON public.members;
CREATE TRIGGER enforce_single_treasurer
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_treasurer();