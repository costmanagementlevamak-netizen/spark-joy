-- Add missing columns to monthly_payments table
ALTER TABLE public.monthly_payments 
ADD COLUMN receipt_url TEXT,
ADD COLUMN payment_type TEXT DEFAULT 'monthly',
ADD COLUMN quick_pay_group_id UUID;