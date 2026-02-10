
-- Table for sequential receipt numbering per module
CREATE TABLE public.receipt_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module text NOT NULL UNIQUE,
  last_number integer NOT NULL DEFAULT 0,
  prefix text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can read receipt_sequences"
ON public.receipt_sequences FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update receipt_sequences"
ON public.receipt_sequences FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can insert receipt_sequences"
ON public.receipt_sequences FOR INSERT WITH CHECK (true);

-- Seed initial sequences
INSERT INTO public.receipt_sequences (module, prefix, last_number) VALUES
  ('treasury', 'TSR', 0),
  ('extraordinary', 'EXT', 0),
  ('degree', 'GRD', 0);

-- Function to get next receipt number atomically
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_module text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next integer;
BEGIN
  UPDATE receipt_sequences
  SET last_number = last_number + 1
  WHERE module = p_module
  RETURNING prefix, last_number INTO v_prefix, v_next;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Module % not found in receipt_sequences', p_module;
  END IF;
  
  RETURN v_prefix || LPAD(v_next::text, 7, '0');
END;
$$;
