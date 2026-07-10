-- Admins may only revoke the Commissioner or Agent roles from a user — never
-- "buyer" (the baseline role everyone has) and never "admin" (prevents both
-- accidental self-lockout and admins removing other admins via this policy).
DROP POLICY IF EXISTS "admin delete roles" ON public.user_roles;
CREATE POLICY "admin delete roles" ON public.user_roles FOR DELETE USING (
  public.has_role(auth.uid(), 'admin')
  AND role IN ('commissioner', 'agent')
);
