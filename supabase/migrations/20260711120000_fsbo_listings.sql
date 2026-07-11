-- Tag listings posted directly by a homeowner (For Sale By Owner), as
-- opposed to ones posted by a Commissioner/Agent.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_owner_listed boolean NOT NULL DEFAULT false;

-- Let ANY signed-in user post their own FSBO listing for themselves,
-- without needing the commissioner or agent role — but only when the
-- listing is explicitly flagged as owner-listed. The existing
-- "commissioners insert own" policy still governs regular (non-FSBO)
-- listings, so this doesn't loosen who can post as a commissioner/agent.
CREATE POLICY "owners insert own fsbo listings" ON public.properties FOR INSERT WITH CHECK (
  auth.uid() = commissioner_id AND is_owner_listed = true
);
