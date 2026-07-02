
-- Allow public browsing of agents and their sales history
CREATE POLICY "public can view commissioner roles"
ON public.user_roles FOR SELECT
TO anon, authenticated
USING (role = 'commissioner');

CREATE POLICY "public can view sales"
ON public.sales FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT ON public.sales TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.properties TO anon;
