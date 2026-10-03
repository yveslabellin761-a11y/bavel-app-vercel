-- Badoo-style favorites and profile pause controls.
CREATE TABLE IF NOT EXISTS public.profile_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, favorited_user_id),
  CHECK (user_id <> favorited_user_id)
);

CREATE INDEX IF NOT EXISTS profile_favorites_user_idx
  ON public.profile_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_favorites_target_idx
  ON public.profile_favorites(favorited_user_id, created_at DESC);

ALTER TABLE public.profile_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile favorites own access" ON public.profile_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_privacy_settings
  ADD COLUMN IF NOT EXISTS profile_paused BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS privacy_profile_paused_idx
  ON public.user_privacy_settings(profile_paused)
  WHERE profile_paused = true;

ALTER TABLE public.profile_favorites REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'profile_favorites'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_favorites;
  END IF;
END $$;
