-- Add missing columns to monthly_payments
ALTER TABLE public.monthly_payments 
  ADD COLUMN receipt_url TEXT,
  ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN quick_pay_group_id TEXT;