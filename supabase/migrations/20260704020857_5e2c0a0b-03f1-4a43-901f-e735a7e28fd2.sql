
-- Expand property types (Zillow-style categories)
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'house';
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'townhome';
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'multi_family';
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'apartment';
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'manufactured';
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'lot_land';

-- Commissioner access requests (users request; admins approve)
CREATE TABLE IF NOT EXISTS public.commissioner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, status)
);

GRANT SELECT, INSERT ON public.commissioner_requests TO authenticated;
GRANT ALL ON public.commissioner_requests TO service_role;

ALTER TABLE public.commissioner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own requests"
  ON public.commissioner_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own requests"
  ON public.commissioner_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update requests"
  ON public.commissioner_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
