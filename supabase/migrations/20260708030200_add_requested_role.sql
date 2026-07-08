-- Let applicants specify exactly which role they're applying for
-- (Commissioner or Agent), instead of a combined generic request.
ALTER TABLE public.commissioner_requests
  ADD COLUMN IF NOT EXISTS requested_role text CHECK (requested_role IN ('commissioner', 'agent'));
