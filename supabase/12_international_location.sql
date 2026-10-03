ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code CHAR(2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_source TEXT DEFAULT 'manual';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_profiles_country_city ON public.profiles(country_code, city);
