-- Create settings table
CREATE TABLE public.settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  monthly_fee NUMERIC DEFAULT 50,
  fiscal_year_start_month INTEGER DEFAULT 7,
  whatsapp_message_template TEXT,
  monthly_report_template TEXT,
  annual_report_template TEXT,
  institution_name TEXT DEFAULT 'Logia',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings (authenticated users can read/write)
CREATE POLICY "Authenticated users can view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON public.settings FOR UPDATE TO authenticated USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.settings (id, institution_name, monthly_fee, fiscal_year_start_month, 
  monthly_report_template, annual_report_template, whatsapp_message_template)
VALUES (
  'default',
  'Logia',
  50,
  7,
  'Este informe presenta el resumen financiero correspondiente al período indicado, con datos reales registrados en el sistema de tesorería.',
  'Este informe presenta el resumen financiero anual consolidado del período fiscal, incluyendo el detalle de ingresos, egresos y balance general.',
  'Estimado hermano, le recordamos que tiene un saldo pendiente de ${monto}. Agradecemos su pronta atención.'
);