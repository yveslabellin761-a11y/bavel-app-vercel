ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  anti_scam_shield BOOLEAN NOT NULL DEFAULT true,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_shadowbanned BOOLEAN NOT NULL DEFAULT false,
  mute_expires_at TIMESTAMPTZ,
  shadowban_expires_at TIMESTAMPTZ,
  last_violation_reason TEXT,
  account_locked BOOLEAN NOT NULL DEFAULT false,
  locked_until TIMESTAMPTZ,
  login_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_security_user_id ON public.user_security(user_id);

ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user security service role only" ON public.user_security;
CREATE POLICY "user security service role only"
  ON public.user_security
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
REVOKE ALL ON TABLE public.user_security FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_security TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname IN (
          'profile photos are publicly readable',
          'users read their own profile photos',
          'users upload their own profile photos',
          'users update their own profile photos',
          'users delete their own profile photos'
        )
        OR coalesce(qual, '') ILIKE '%profile-photos%'
        OR coalesce(with_check, '') ILIKE '%profile-photos%'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', existing_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "users read their own profile photos"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users upload their own profile photos"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users update their own profile photos"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users delete their own profile photos"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
