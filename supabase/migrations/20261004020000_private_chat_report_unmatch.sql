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
  WHERE (user_id = p_reporter_id AND matched_user_id = target_message.sender_id)
     OR (user_id = target_message.sender_id AND matched_user_id = p_reporter_id);

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.report_private_chat_image(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_private_chat_image(UUID, UUID) TO service_role;
