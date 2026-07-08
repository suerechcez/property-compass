-- Admins can no longer be revoked via the app (by themselves or other admins) —
-- only the direct database owner can remove an admin role, via SQL editor.
DROP POLICY IF EXISTS "admin delete roles" ON public.user_roles;
CREATE POLICY "admin delete non-admin roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') AND role <> 'admin');
