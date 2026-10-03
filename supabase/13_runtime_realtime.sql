-- Runtime hardening for production Realtime and authenticated likes.

ALTER TABLE public.swipes REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

DROP POLICY IF EXISTS "swipes_select_own" ON public.swipes;
CREATE POLICY "swipes_select_own" ON public.swipes
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "swipes_insert_own" ON public.swipes;
CREATE POLICY "swipes_insert_own" ON public.swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND user_id <> target_id);

DROP POLICY IF EXISTS "swipes_update_own" ON public.swipes;
CREATE POLICY "swipes_update_own" ON public.swipes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND user_id <> target_id);

DROP POLICY IF EXISTS "swipes_delete_own" ON public.swipes;
CREATE POLICY "swipes_delete_own" ON public.swipes
  FOR DELETE USING (auth.uid() = user_id);
