-- Real-estate-specific profile fields for commissioners/agents: license credibility,
-- brokerage affiliation, specialties, service areas, and languages spoken.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS agency_name text,
  ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text,
  ADD COLUMN IF NOT EXISTS facebook_url text;
