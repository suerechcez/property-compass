-- Lets a commissioner/agent mark one of their own listings as a "Featured
-- Sale" to spotlight on their public profile, independent of the sales log.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
