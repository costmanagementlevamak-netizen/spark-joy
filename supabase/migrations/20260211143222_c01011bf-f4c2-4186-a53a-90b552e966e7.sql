-- Add indexes for performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_monthly_payments_member_id ON public.monthly_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_month_year ON public.monthly_payments(month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_member_month_year ON public.monthly_payments(member_id, month, year);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_extraordinary_payments_fee_id ON public.extraordinary_payments(extraordinary_fee_id);
CREATE INDEX IF NOT EXISTS idx_extraordinary_payments_member_id ON public.extraordinary_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_extraordinary_payments_fee_member ON public.extraordinary_payments(extraordinary_fee_id, member_id);
CREATE INDEX IF NOT EXISTS idx_degree_fees_fee_date ON public.degree_fees(fee_date);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_cargo_logial ON public.members(cargo_logial);
