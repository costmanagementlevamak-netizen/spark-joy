-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Create policies for receipt uploads
CREATE POLICY "Receipts are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receipts');

CREATE POLICY "Anyone can upload receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Anyone can update receipts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'receipts');

CREATE POLICY "Anyone can delete receipts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'receipts');

-- Add receipt_url to monthly_payments
ALTER TABLE public.monthly_payments 
ADD COLUMN receipt_url TEXT;

-- Add receipt_url to expenses
ALTER TABLE public.expenses 
ADD COLUMN receipt_url TEXT;

-- Add receipt_url to extraordinary_fees for per-member payments
ALTER TABLE public.extraordinary_fees 
ADD COLUMN receipt_url TEXT;