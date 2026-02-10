-- Add parent_fee_id column to properly isolate payments per fee
ALTER TABLE public.extraordinary_fees 
ADD COLUMN IF NOT EXISTS parent_fee_id UUID REFERENCES public.extraordinary_fees(id) ON DELETE CASCADE;

-- Add receipt_url column for payment receipts
ALTER TABLE public.extraordinary_fees 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create index for better performance when querying payments by parent fee
CREATE INDEX IF NOT EXISTS idx_extraordinary_fees_parent_fee_id 
ON public.extraordinary_fees(parent_fee_id) 
WHERE parent_fee_id IS NOT NULL;

-- Update existing payment references to use the new column
-- This migrates data from the notes field (fee_ref:xxx) to proper parent_fee_id
UPDATE public.extraordinary_fees 
SET parent_fee_id = (
  CASE 
    WHEN notes LIKE '%fee_ref:%' THEN 
      SUBSTRING(notes FROM 'fee_ref:([a-f0-9-]+)')::UUID
    ELSE NULL
  END
)
WHERE notes LIKE '%fee_ref:%' 
AND parent_fee_id IS NULL;