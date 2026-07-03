
CREATE POLICY "admin update properties" ON public.properties FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete properties" ON public.properties FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin view drafts" ON public.properties FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin view all sales" ON public.sales FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update sales" ON public.sales FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete sales" ON public.sales FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin view roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
