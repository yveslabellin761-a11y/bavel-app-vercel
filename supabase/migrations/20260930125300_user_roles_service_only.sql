DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
  GRANT ALL ON TABLE public.user_roles TO service_role;

  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_roles', existing_policy.policyname);
  END LOOP;
END;
$$;
