-- Admin-controlled "Verified" badge for profiles (agents/commissioners),
-- shown sitewide next to their name on listing cards, search results, and
-- the agent directory. This is intentionally separate from license_number
-- (which is self-reported by the user during onboarding) — is_verified is
-- a manual admin attestation and must never be settable by the profile
-- owner themselves.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- RLS policies are row-level only — the existing "users update own profile"
-- policy (auth.uid() = id) would otherwise let any user flip is_verified on
-- their own row via a plain `.update({ is_verified: true })` call. This
-- trigger closes that gap by silently discarding any change to
-- is_verified unless the acting user holds the 'admin' role, regardless of
-- which policy let the statement through.
CREATE OR REPLACE FUNCTION public.protect_verified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.is_verified := OLD.is_verified;
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.is_verified IS TRUE THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.is_verified := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_verified_column ON public.profiles;
CREATE TRIGGER protect_verified_column
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_verified_column();

-- Admins need to be able to update *some* profile that isn't their own in
-- order to toggle is_verified — no such policy existed before (admins could
-- only SELECT all profiles). The trigger above is what actually keeps
-- non-admins from setting is_verified, so this policy granting admins
-- general update access to any profile is safe to add alongside it.
DROP POLICY IF EXISTS "admin update any profile" ON public.profiles;
CREATE POLICY "admin update any profile" ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
