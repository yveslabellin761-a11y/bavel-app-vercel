-- Phase 4: trust, moderation, sanctions and GDPR hardening.

ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.content_flags
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_content_flags_pending
  ON public.content_flags(status, created_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.deactivate_expired_sanctions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.sanctions
  SET is_active = false, updated_at = now()
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= now();
$$;
