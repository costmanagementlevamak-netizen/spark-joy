
-- Update receipt prefix for extraordinary module from EXT to CEX
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_module text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHEN 'extraordinary' THEN v_prefix := 'CEX';
    WHEN 'degree' THEN v_prefix := 'DG';
    ELSE v_prefix := 'REC';
  END CASE;
  
  RETURN v_prefix || LPAD(v_next::TEXT, 7, '0');
END;
$function$;
