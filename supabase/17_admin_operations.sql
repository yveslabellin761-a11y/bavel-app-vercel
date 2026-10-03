CREATE TABLE IF NOT EXISTS public.system_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info' CHECK (kind IN ('info', 'maintenance', 'event', 'promo')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_broadcasts_active_idx
  ON public.system_broadcasts(active, created_at DESC);

ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active broadcasts are publicly readable"
  ON public.system_broadcasts FOR SELECT USING (active = true OR auth.is_admin());
CREATE POLICY "Admins manage broadcasts"
  ON public.system_broadcasts FOR ALL USING (auth.is_admin()) WITH CHECK (auth.is_admin());
