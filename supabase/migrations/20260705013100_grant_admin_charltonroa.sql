-- Grant the 'admin' role to charltonroa@gmail.com, if that account already exists.
-- This is idempotent: safe to re-run, and it silently no-ops if the user
-- hasn't signed up yet (run it again after they create an account).
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'charltonroa@gmail.com'
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
