-- Add new required fields to members table for complete registration
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS cedula text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS join_date date,
ADD COLUMN IF NOT EXISTS birth_date date;

-- Remove whatsapp_message_template column from settings as it's no longer needed
ALTER TABLE public.settings
DROP COLUMN IF EXISTS whatsapp_message_template;