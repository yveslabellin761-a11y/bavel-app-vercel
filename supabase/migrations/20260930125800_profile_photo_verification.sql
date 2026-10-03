-- Server-authoritative photo verification challenges. Camera frames and face embeddings
-- are processed in memory and are never stored in this table.
CREATE TABLE IF NOT EXISTS public.profile_photo_verification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nonce_hash TEXT NOT NULL,
  profile_fingerprint TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('blink', 'turn_left', 'turn_right')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profile_photo_verification_user_created
  ON public.profile_photo_verification_challenges(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_photo_verification_expiry
  ON public.profile_photo_verification_challenges(status, expires_at);

ALTER TABLE public.profile_photo_verification_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_photo_verification_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_photo_verification_challenges TO service_role;

CREATE OR REPLACE FUNCTION public.create_profile_photo_verification_challenge(
  p_user_id UUID,
  p_nonce_hash TEXT,
  p_challenge_type TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  challenge_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT)::BIGINT);
  DELETE FROM public.profile_photo_verification_challenges
  WHERE user_id = p_user_id
    AND created_at < NOW() - INTERVAL '30 days';

  IF (
    SELECT COUNT(*)
    FROM public.profile_photo_verification_challenges
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '30 minutes'
  ) >= 5 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profile_photo_verification_challenges (
    user_id,
    nonce_hash,
    profile_fingerprint,
    challenge_type,
    expires_at
  )
  SELECT
    p.id,
    p_nonce_hash,
    md5(COALESCE(p.photos::TEXT, '[]') || ':' || COALESCE(p.avatar_url, '')),
    p_challenge_type,
    p_expires_at
  FROM public.profiles AS p
  WHERE p.id = p_user_id
    AND p.is_verified IS FALSE
  RETURNING id INTO challenge_id;

  RETURN challenge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_profile_photo_verification_challenge(UUID, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_photo_verification_challenge(UUID, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_verified IS DISTINCT FROM false
       OR NEW.role IS DISTINCT FROM 'user'
       OR NEW.is_suspended IS DISTINCT FROM false
       OR NEW.tier IS DISTINCT FROM 'freemium' THEN
      RAISE EXCEPTION 'Privileged profile fields can only be changed by the server.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF (NEW.is_verified IS DISTINCT FROM OLD.is_verified
         AND NOT (
           NEW.is_verified IS FALSE
           AND (
             NEW.photos IS DISTINCT FROM OLD.photos
             OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
           )
         ))
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     OR NEW.tier IS DISTINCT FROM OLD.tier THEN
    RAISE EXCEPTION 'Privileged profile fields can only be changed by the server.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_profile_photo_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.photos IS DISTINCT FROM OLD.photos
     OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_a_invalidate_photo_verification ON public.profiles;
CREATE TRIGGER profiles_a_invalidate_photo_verification
  BEFORE UPDATE OF photos, avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_profile_photo_verification();

CREATE OR REPLACE FUNCTION public.clear_profile_photo_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.photos IS DISTINCT FROM OLD.photos
     OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.profile_verification_status
    SET is_verified = false,
        selfie_verified = false,
        last_verification_at = NULL,
        updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_profile_photo_verification_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_profile_photo_verification_status() TO service_role;

DROP TRIGGER IF EXISTS profiles_z_clear_photo_verification_status ON public.profiles;
CREATE TRIGGER profiles_z_clear_photo_verification_status
  AFTER UPDATE OF photos, avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_profile_photo_verification_status();

CREATE OR REPLACE FUNCTION public.complete_profile_photo_verification(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  challenge public.profile_photo_verification_challenges%ROWTYPE;
  current_fingerprint TEXT;
BEGIN
  SELECT *
  INTO challenge
  FROM public.profile_photo_verification_challenges
  WHERE id = p_challenge_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR challenge.status <> 'processing' OR challenge.expires_at <= NOW() THEN
    RETURN false;
  END IF;

  SELECT md5(COALESCE(photos::TEXT, '[]') || ':' || COALESCE(avatar_url, ''))
  INTO current_fingerprint
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND OR current_fingerprint <> challenge.profile_fingerprint THEN
    UPDATE public.profile_photo_verification_challenges
    SET status = 'rejected',
        completed_at = NOW()
    WHERE id = p_challenge_id;
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET is_verified = true,
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.profile_photo_verification_challenges
  SET status = 'approved',
      completed_at = NOW()
  WHERE id = p_challenge_id;

  INSERT INTO public.profile_verification_status (
    user_id,
    is_verified,
    selfie_verified,
    last_verification_at,
    updated_at
  )
  VALUES (p_user_id, true, true, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET is_verified = true,
        selfie_verified = true,
        last_verification_at = NOW(),
        updated_at = NOW();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_profile_photo_verification(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_profile_photo_verification(UUID, UUID) TO service_role;
