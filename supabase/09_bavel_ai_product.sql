-- Bavel AI product signals, privacy controls and server-backed engagement.

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression', 'profile_view', 'like', 'superlike', 'pass',
    'match', 'message_sent', 'message_replied', 'block', 'report'
  )),
  position INTEGER,
  score NUMERIC(5,2),
  model_version TEXT NOT NULL DEFAULT 'bavel-rules-v1',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_time
  ON public.recommendation_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_candidate
  ON public.recommendation_events(candidate_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.profile_scores (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL CHECK (score_type IN ('trust', 'activity', 'quality', 'popularity')),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  sample_size INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  model_version TEXT NOT NULL DEFAULT 'bavel-rules-v1',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, score_type)
);

CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  incognito_mode BOOLEAN NOT NULL DEFAULT false,
  show_online_status BOOLEAN NOT NULL DEFAULT true,
  show_distance BOOLEAN NOT NULL DEFAULT true,
  allow_calls BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendation events own access" ON public.recommendation_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recommendation events own insert" ON public.recommendation_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profile scores own access" ON public.profile_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "privacy settings own access" ON public.user_privacy_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

