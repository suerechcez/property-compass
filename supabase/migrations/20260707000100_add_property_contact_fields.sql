-- Add dedicated contact fields to properties, so listing contact info isn't
-- baked into free-text description (which would duplicate on every edit).
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;
