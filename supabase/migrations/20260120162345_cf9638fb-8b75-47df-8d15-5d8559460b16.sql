-- Make full_name nullable since we now use 'name' column
ALTER TABLE public.members ALTER COLUMN full_name DROP NOT NULL;

-- Create a trigger to keep full_name in sync with name
CREATE OR REPLACE FUNCTION public.sync_member_name()
RETURNS TRIGGER AS $$
BEGIN
  -- When name is set, also set full_name for backward compatibility
  IF NEW.name IS NOT NULL THEN
    NEW.full_name = NEW.name;
  END IF;
  -- When full_name is set but name is not, sync the other way
  IF NEW.full_name IS NOT NULL AND NEW.name IS NULL THEN
    NEW.name = NEW.full_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync names on insert and update
DROP TRIGGER IF EXISTS sync_member_name_trigger ON public.members;
CREATE TRIGGER sync_member_name_trigger
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_name();