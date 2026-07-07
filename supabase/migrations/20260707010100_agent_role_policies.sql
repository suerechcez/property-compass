-- Let agents insert/manage properties the same way commissioners can.
DROP POLICY IF EXISTS "commissioners insert own" ON public.properties;
CREATE POLICY "commissioners insert own" ON public.properties FOR INSERT WITH CHECK (
  auth.uid() = commissioner_id
  AND (
    public.has_role(auth.uid(),'commissioner')
    OR public.has_role(auth.uid(),'agent')
    OR public.has_role(auth.uid(),'developer')
  )
);

-- Let the public directory show agents too, not just commissioners.
DROP POLICY IF EXISTS "public can view commissioner roles" ON public.user_roles;
CREATE POLICY "public can view commissioner roles"
ON public.user_roles FOR SELECT
TO anon, authenticated
USING (role IN ('commissioner', 'agent'));
