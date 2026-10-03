CREATE TABLE IF NOT EXISTS public.user_activity_daily (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_key DATE NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0),
  contacts INTEGER NOT NULL DEFAULT 0 CHECK (contacts >= 0),
  swipes INTEGER NOT NULL DEFAULT 0 CHECK (swipes >= 0),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date_key)
);

ALTER TABLE public.user_activity_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity"
  ON public.user_activity_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users record own activity"
  ON public.user_activity_daily FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own activity"
  ON public.user_activity_daily FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_user_activity_daily(
  p_user_id UUID,
  p_type TEXT,
  p_count INTEGER
) RETURNS public.user_activity_daily
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.user_activity_daily;
BEGIN
  IF p_type NOT IN ('like', 'visit', 'contact', 'swipe')
    OR p_count < 1 OR p_count > 100 THEN
    RAISE EXCEPTION 'Invalid activity increment';
  END IF;

  INSERT INTO public.user_activity_daily (user_id, date_key, likes, visits, contacts, swipes)
  VALUES (
    p_user_id,
    (now() AT TIME ZONE 'UTC')::date,
    CASE WHEN p_type = 'like' THEN p_count ELSE 0 END,
    CASE WHEN p_type = 'visit' THEN p_count ELSE 0 END,
    CASE WHEN p_type = 'contact' THEN p_count ELSE 0 END,
    CASE WHEN p_type = 'swipe' THEN p_count ELSE 0 END
  )
  ON CONFLICT (user_id, date_key) DO UPDATE SET
    likes = user_activity_daily.likes + EXCLUDED.likes,
    visits = user_activity_daily.visits + EXCLUDED.visits,
    contacts = user_activity_daily.contacts + EXCLUDED.contacts,
    swipes = user_activity_daily.swipes + EXCLUDED.swipes,
    updated_at = now()
  RETURNING * INTO updated;

  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_activity_daily(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_activity_daily(UUID, TEXT, INTEGER) TO service_role;
