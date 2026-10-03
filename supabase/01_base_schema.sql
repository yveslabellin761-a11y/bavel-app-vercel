-- ================================================================
-- SUPABASE PRODUCTION SCHEMA - PART 1: BASE TABLES
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 120),
  gender TEXT CHECK (gender IN ('homme', 'femme', 'autre')),
  city TEXT,
  country TEXT,
  country_code CHAR(2),
  location_source TEXT DEFAULT 'manual' CHECK (location_source IN ('manual', 'ip', 'gps')),
  location_updated_at TIMESTAMP WITH TIME ZONE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  bio TEXT,
  job TEXT,
  studies TEXT,
  alcohol TEXT,
  personality TEXT,
  zodiac TEXT,
  pets TEXT,
  photos TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  details JSONB DEFAULT '{}'::jsonb,
  is_verified BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  daily_likes_count INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  tier TEXT DEFAULT 'freemium' CHECK (tier IN ('freemium', 'extra', 'premium', 'vip')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  last_inactivity_push_sent TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_verified ON public.profiles(is_verified);
CREATE INDEX idx_profiles_is_suspended ON public.profiles(is_suspended);
CREATE INDEX idx_profiles_tier ON public.profiles(tier);
CREATE INDEX idx_profiles_gender_age ON public.profiles(gender, age);
CREATE INDEX idx_profiles_location ON public.profiles(city, latitude, longitude);
CREATE INDEX idx_profiles_country_city ON public.profiles(country_code, city);

-- 2. SWIPES TABLE (who liked whom)
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_liked BOOLEAN DEFAULT false,
  is_super_like BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_id),
  CHECK (user_id != target_id)
);

CREATE INDEX idx_swipes_user_id ON public.swipes(user_id);
CREATE INDEX idx_swipes_target_id ON public.swipes(target_id);
CREATE INDEX idx_swipes_is_liked ON public.swipes(is_liked);

-- 3. MATCHES TABLE (mutual likes)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  UNIQUE(user_id, matched_user_id),
  CHECK (user_id != matched_user_id)
);

CREATE INDEX idx_matches_user_id ON public.matches(user_id);
CREATE INDEX idx_matches_matched_user_id ON public.matches(matched_user_id);
CREATE INDEX idx_matches_is_archived ON public.matches(is_archived);

-- 4. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'call')),
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_messages_match_id ON public.messages(match_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_is_read ON public.messages(is_read);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- 5. BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id)
);

CREATE INDEX idx_blocks_user_id ON public.blocks(user_id);
CREATE INDEX idx_blocks_blocked_user_id ON public.blocks(blocked_user_id);

-- 6. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('harassment', 'fake_profile', 'inappropriate_content', 'scam', 'hate_speech', 'spam', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  CHECK (reporter_id != reported_id)
);

CREATE INDEX idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX idx_reports_reported_id ON public.reports(reported_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_category ON public.reports(category);
CREATE INDEX idx_reports_created_at ON public.reports(created_at);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'match', 'message', 'super_like', 'visit', 'match_reminder', 'system', 'gift')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (will be expanded later)
CREATE POLICY "Profiles are viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
