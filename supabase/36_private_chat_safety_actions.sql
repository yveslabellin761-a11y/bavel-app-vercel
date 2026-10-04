CREATE TABLE IF NOT EXISTS public.message_user_hides (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.message_user_hides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.message_user_hides FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.message_user_hides TO service_role;

CREATE OR REPLACE FUNCTION public.hide_chat_message_for_user(
  p_message_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_message public.messages%ROWTYPE;
BEGIN
  SELECT * INTO target_message
  FROM public.messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND
     OR p_user_id IS NULL
     OR p_user_id NOT IN (target_message.sender_id, target_message.receiver_id)
     OR target_message.message_type <> 'image'
     OR NOT target_message.is_private_content THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.message_user_hides (message_id, user_id)
  VALUES (p_message_id, p_user_id)
  ON CONFLICT (message_id, user_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_private_chat_image(
  p_message_id UUID,
  p_reporter_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_message public.messages%ROWTYPE;
BEGIN
  SELECT * INTO target_message
  FROM public.messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND
     OR p_reporter_id IS NULL
     OR p_reporter_id <> target_message.receiver_id
     OR target_message.message_type <> 'image'
     OR NOT target_message.is_private_content
     OR target_message.media_url IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reports
    WHERE reporter_id = p_reporter_id
      AND reported_id = target_message.sender_id
      AND description = 'Photo de discussion signalée comme potentiellement intime; message ' || p_message_id::TEXT
  ) THEN
    INSERT INTO public.reports (
      reporter_id,
      reported_id,
      category,
      description,
      evidence_urls,
      status
    )
    VALUES (
      p_reporter_id,
      target_message.sender_id,
      'inappropriate_content',
      'Photo de discussion signalée comme potentiellement intime; message ' || p_message_id::TEXT,
      ARRAY[target_message.media_url],
      'pending'
    );
  END IF;

  INSERT INTO public.blocks (user_id, blocked_user_id, reason)
  VALUES (p_reporter_id, target_message.sender_id, 'Signalement de photo intime non sollicitée')
  ON CONFLICT (user_id, blocked_user_id)
  DO UPDATE SET reason = EXCLUDED.reason;

  DELETE FROM public.swipes
  WHERE (user_id = p_reporter_id AND target_id = target_message.sender_id)
     OR (user_id = target_message.sender_id AND target_id = p_reporter_id);

  DELETE FROM public.matches
  WHERE id = target_message.match_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.hide_chat_message_for_user(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.report_private_chat_image(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hide_chat_message_for_user(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.report_private_chat_image(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_private_chat_media_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.media_url ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
     AND OLD.message_type = 'image'
     AND NOT EXISTS (
       SELECT 1
       FROM public.reports
       WHERE evidence_urls @> ARRAY[OLD.media_url]
         AND status IN ('pending', 'investigating')
     ) THEN
    INSERT INTO public.private_media_cleanup_queue (object_path)
    VALUES (OLD.media_url)
    ON CONFLICT (object_path) DO NOTHING;
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_resolved_private_report_evidence_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evidence_path TEXT;
BEGIN
  IF NEW.status IN ('resolved', 'dismissed') AND OLD.status NOT IN ('resolved', 'dismissed') THEN
    FOREACH evidence_path IN ARRAY COALESCE(NEW.evidence_urls, '{}'::TEXT[]) LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.reports
        WHERE id <> NEW.id
          AND status IN ('pending', 'investigating')
          AND evidence_urls @> ARRAY[evidence_path]
      ) THEN
        INSERT INTO public.private_media_cleanup_queue (object_path)
        VALUES (evidence_path)
        ON CONFLICT (object_path) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_private_evidence_cleanup ON public.reports;
CREATE TRIGGER reports_private_evidence_cleanup
AFTER UPDATE OF status ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_resolved_private_report_evidence_cleanup();

REVOKE ALL ON FUNCTION public.enqueue_resolved_private_report_evidence_cleanup()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_resolved_private_report_evidence_cleanup() TO service_role;
