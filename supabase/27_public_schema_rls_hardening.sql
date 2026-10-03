DO $$
DECLARE
  public_table RECORD;
  restricted_table TEXT;
BEGIN
  FOR public_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', public_table.tablename);
  END LOOP;

  FOREACH restricted_table IN ARRAY ARRAY[
    'reset_tokens',
    'user_passwords',
    'user_security',
    'user_profiles_store',
    'encounters_likes',
    'encounters_matches',
    'user_accounts',
    'admin_actions',
    'moderation_queue',
    'profile_verification_status',
    'audit_logs',
    'sanctions',
    'violation_records',
    'message_scans',
    'suspicious_activity',
    'content_flags',
    'profile_visits',
    'private_media_cleanup_queue',
    'account_deletion_requests',
    'profile_updates_history',
    'security_logs',
    'telemetry',
    'rate_limits'
  ]
  LOOP
    IF to_regclass(format('public.%I', restricted_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', restricted_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', restricted_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', restricted_table);
    END IF;
  END LOOP;

  IF to_regclass('public.user_security') IS NOT NULL THEN
    FOR public_table IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'user_security'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.user_security', public_table.policyname);
    END LOOP;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Les profils sont visibles par tout le monde." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by all" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view non-suspended profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
