
-- Add emergency contact fields to members table
ALTER TABLE public.members ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE public.members ADD COLUMN emergency_contact_phone TEXT;
