-- Add missing columns to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS whatsapp_message_template TEXT DEFAULT 'Estimado hermano, le recordamos que tiene un saldo pendiente de ${monto}. Agradecemos su pronta atención.',
ADD COLUMN IF NOT EXISTS monthly_report_template TEXT DEFAULT 'Este informe presenta el resumen financiero correspondiente al período indicado, con datos reales registrados en el sistema de tesorería.',
ADD COLUMN IF NOT EXISTS annual_report_template TEXT DEFAULT 'Este informe presenta el resumen financiero anual consolidado del período fiscal, incluyendo el detalle de ingresos, egresos y balance general.';

-- Add is_treasurer column to members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS is_treasurer BOOLEAN DEFAULT false;