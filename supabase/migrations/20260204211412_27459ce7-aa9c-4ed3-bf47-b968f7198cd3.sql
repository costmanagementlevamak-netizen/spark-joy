-- Add missing columns to monthly_payments table
ALTER TABLE public.monthly_payments 
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS quick_pay_group_id text;