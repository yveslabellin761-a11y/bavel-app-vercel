-- Store chat images in a private bucket; access is issued only by the
-- authenticated application server after checking match participation.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private-chat-media',
  'private-chat-media',
  false,
  10485760,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_ephemeral BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_private_content BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS media_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read'
  ) THEN
    UPDATE public.messages SET is_read = true WHERE read IS TRUE AND is_read IS FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'timestamp'
  ) THEN
    UPDATE public.messages SET created_at = timestamp WHERE created_at IS NULL;
  END IF;

  UPDATE public.messages SET created_at = now() WHERE created_at IS NULL;
  ALTER TABLE public.messages
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN created_at SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_ephemeral_media_expiry
  ON public.messages (media_expires_at)
  WHERE is_ephemeral = true AND media_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_ephemeral_media_viewed
  ON public.messages (media_viewed_at)
  WHERE is_ephemeral = true AND media_url IS NOT NULL AND media_viewed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.private_media_cleanup_queue (
  object_path TEXT PRIMARY KEY,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.private_media_cleanup_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enqueue_private_chat_media_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.media_url ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
     AND OLD.message_type = 'image' THEN
    INSERT INTO public.private_media_cleanup_queue (object_path)
    VALUES (OLD.media_url)
    ON CONFLICT (object_path) DO NOTHING;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS messages_private_media_cleanup ON public.messages;
CREATE TRIGGER messages_private_media_cleanup
AFTER DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_private_chat_media_cleanup();

DROP TRIGGER IF EXISTS messages_private_media_expired_cleanup ON public.messages;
CREATE TRIGGER messages_private_media_expired_cleanup
AFTER UPDATE OF media_url ON public.messages
FOR EACH ROW
WHEN (OLD.media_url IS NOT NULL AND NEW.media_url IS NULL)
EXECUTE FUNCTION public.enqueue_private_chat_media_cleanup();
