-- Fix: anon had an RLS policy allowing it to view commissioner/agent roles,
-- but was never granted base SELECT privilege on the table at all (only
-- "authenticated" was). Without the underlying GRANT, RLS policies have
-- nothing to work with, so signed-out visitors to the public agent
-- directory saw nobody listed. This restores the missing grant.
GRANT SELECT ON public.user_roles TO anon;

-- Capture real applicant detail on Commissioner/Agent requests so admins can
-- review a proper application (name, contact info, and a specific reason)
-- instead of just a free-form note.
ALTER TABLE public.commissioner_requests
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS reason text;
