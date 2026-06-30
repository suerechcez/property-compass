
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('developer', 'commissioner', 'buyer');
CREATE TYPE public.property_type AS ENUM ('condo', 'hotel', 'raw_land', 'resell');
CREATE TYPE public.property_status AS ENUM ('draft', 'published', 'sold', 'rented');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + buyer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commissioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  property_type public.property_type NOT NULL,
  status public.property_status NOT NULL DEFAULT 'published',
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  location TEXT,
  bedrooms INT,
  bathrooms INT,
  area_sqm NUMERIC(10,2),
  images TEXT[] NOT NULL DEFAULT '{}',
  features TEXT[] NOT NULL DEFAULT '{}',
  for_rent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published properties public" ON public.properties FOR SELECT USING (status <> 'draft' OR auth.uid() = commissioner_id OR public.has_role(auth.uid(),'developer'));
CREATE POLICY "commissioners insert own" ON public.properties FOR INSERT WITH CHECK (auth.uid() = commissioner_id AND (public.has_role(auth.uid(),'commissioner') OR public.has_role(auth.uid(),'developer')));
CREATE POLICY "owner or developer update" ON public.properties FOR UPDATE USING (auth.uid() = commissioner_id OR public.has_role(auth.uid(),'developer'));
CREATE POLICY "owner or developer delete" ON public.properties FOR DELETE USING (auth.uid() = commissioner_id OR public.has_role(auth.uid(),'developer'));
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commissioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  buyer_name TEXT,
  amount NUMERIC(14,2) NOT NULL,
  commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sales or developer view" ON public.sales FOR SELECT USING (auth.uid() = commissioner_id OR public.has_role(auth.uid(),'developer'));
CREATE POLICY "commissioner insert own sales" ON public.sales FOR INSERT WITH CHECK (auth.uid() = commissioner_id OR public.has_role(auth.uid(),'developer'));
CREATE POLICY "developer update sales" ON public.sales FOR UPDATE USING (auth.uid() = commissioner_id OR public.has_role(auth.uid(),'developer'));
CREATE POLICY "developer delete sales" ON public.sales FOR DELETE USING (auth.uid() = commissioner_id OR public.has_role(auth.uid(),'developer'));

-- Developer updates (announcements)
CREATE TABLE public.developer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.developer_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developer_updates TO authenticated;
GRANT ALL ON public.developer_updates TO service_role;
ALTER TABLE public.developer_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "updates public read" ON public.developer_updates FOR SELECT USING (true);
CREATE POLICY "developer write updates" ON public.developer_updates FOR INSERT WITH CHECK (public.has_role(auth.uid(),'developer'));
CREATE POLICY "developer modify updates" ON public.developer_updates FOR UPDATE USING (public.has_role(auth.uid(),'developer'));
CREATE POLICY "developer delete updates" ON public.developer_updates FOR DELETE USING (public.has_role(auth.uid(),'developer'));
