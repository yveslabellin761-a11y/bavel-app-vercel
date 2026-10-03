ALTER TABLE public.activity_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.activity_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.activity_messages TO authenticated;

DROP POLICY IF EXISTS "Participants can send activity messages" ON public.activity_messages;
DROP POLICY IF EXISTS "Participants can view activity messages" ON public.activity_messages;

CREATE POLICY "Participants can view activity messages"
  ON public.activity_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.activity_participants AS participant
      WHERE participant.activity_id = activity_messages.activity_id
        AND participant.user_id = auth.uid()::text
        AND participant.status = 'going'
    )
  );

CREATE POLICY "Participants can send activity messages"
  ON public.activity_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.activity_participants AS participant
      WHERE participant.activity_id = activity_messages.activity_id
        AND participant.user_id = auth.uid()::text
        AND participant.status = 'going'
    )
  );
