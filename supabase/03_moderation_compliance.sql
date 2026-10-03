-- ================================================================
-- SUPABASE PRODUCTION SCHEMA - PART 3: MODERATION & COMPLIANCE
-- ================================================================

-- 16. MODERATION QUEUE (reports needing review)
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'escalated')),
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_moderation_queue_report_id ON public.moderation_queue(report_id);
CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX idx_moderation_queue_assigned_to ON public.moderation_queue(assigned_to);
CREATE INDEX idx_moderation_queue_priority ON public.moderation_queue(priority DESC);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can view queue" ON public.moderation_queue;
REVOKE ALL ON TABLE public.moderation_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.moderation_queue TO service_role;

-- 17. SANCTIONS (bans, mutes, shadowbans with duration tracking)
CREATE TABLE IF NOT EXISTS public.sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sanction_type TEXT NOT NULL CHECK (sanction_type IN ('mute', 'shadowban', 'suspension', 'permanent_ban')),
  reason TEXT NOT NULL,
  duration_days INTEGER,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  appeal_url TEXT,
  appeal_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sanctions_user_id ON public.sanctions(user_id);
CREATE INDEX idx_sanctions_is_active ON public.sanctions(is_active);
CREATE INDEX idx_sanctions_sanction_type ON public.sanctions(sanction_type);
CREATE INDEX idx_sanctions_expires_at ON public.sanctions(expires_at);

ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users cannot view sanctions" ON public.sanctions FOR SELECT USING (false);

-- 18. VIOLATION RECORDS (track rule violations for escalation)
CREATE TABLE IF NOT EXISTS public.violation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  evidence TEXT,
  resolved BOOLEAN DEFAULT false,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_violation_records_user_id ON public.violation_records(user_id);
CREATE INDEX idx_violation_records_severity ON public.violation_records(severity);
CREATE INDEX idx_violation_records_resolved ON public.violation_records(resolved);

ALTER TABLE public.violation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Violations not visible to users" ON public.violation_records FOR SELECT USING (false);

-- 19. MESSAGE MODERATION (scan for abuse, links, etc)
CREATE TABLE IF NOT EXISTS public.message_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'flagged', 'blocked')),
  phishing_score FLOAT DEFAULT 0,
  abuse_score FLOAT DEFAULT 0,
  has_suspicious_links BOOLEAN DEFAULT false,
  has_profanity BOOLEAN DEFAULT false,
  contains_media BOOLEAN DEFAULT false,
  scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_scans_message_id ON public.message_scans(message_id);
CREATE INDEX idx_message_scans_scan_status ON public.message_scans(scan_status);

ALTER TABLE public.message_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scans not visible to users" ON public.message_scans FOR SELECT USING (false);

-- 20. PROFILE VERIFICATION STATUS
CREATE TABLE IF NOT EXISTS public.profile_verification_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  selfie_verified BOOLEAN DEFAULT false,
  id_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT true,
  background_check_passed BOOLEAN DEFAULT false,
  verification_badges TEXT[] DEFAULT '{}',
  last_verification_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profile_verification_status_user_id ON public.profile_verification_status(user_id);
CREATE INDEX idx_profile_verification_status_is_verified ON public.profile_verification_status(is_verified);

ALTER TABLE public.profile_verification_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Verification status is public" ON public.profile_verification_status;
REVOKE ALL ON TABLE public.profile_verification_status FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_verification_status TO service_role;

-- 21. COMPLIANCE & GDPR REQUESTS
CREATE TABLE IF NOT EXISTS public.data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'access')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  request_data JSONB DEFAULT '{}',
  generated_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_data_requests_user_id ON public.data_requests(user_id);
CREATE INDEX idx_data_requests_status ON public.data_requests(status);
CREATE INDEX idx_data_requests_request_type ON public.data_requests(request_type);

ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own requests" ON public.data_requests FOR SELECT USING (auth.uid() = user_id);

-- 22. SUSPICIOUS ACTIVITY LOG
CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  device_info TEXT,
  risk_score FLOAT DEFAULT 0,
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suspicious_activity_user_id ON public.suspicious_activity(user_id);
CREATE INDEX idx_suspicious_activity_flagged ON public.suspicious_activity(flagged);
CREATE INDEX idx_suspicious_activity_created_at ON public.suspicious_activity(created_at);

ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity logs not visible to users" ON public.suspicious_activity FOR SELECT USING (false);

-- 23. CONTENT MODERATION FLAGS
CREATE TABLE IF NOT EXISTS public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('profile', 'message', 'photo')),
  reason TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'removed', 'approved')),
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_flags_content_id ON public.content_flags(content_id);
CREATE INDEX idx_content_flags_content_type ON public.content_flags(content_type);
CREATE INDEX idx_content_flags_status ON public.content_flags(status);

ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flags not visible to users" ON public.content_flags FOR SELECT USING (false);

-- 24. VISIT LOG (who viewed whose profile - for analytics & anti-abuse)
CREATE TABLE IF NOT EXISTS public.profile_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(visitor_id, visited_user_id, DATE(created_at))
);

CREATE INDEX idx_profile_visits_visitor_id ON public.profile_visits(visitor_id);
CREATE INDEX idx_profile_visits_visited_user_id ON public.profile_visits(visited_user_id);
CREATE INDEX idx_profile_visits_created_at ON public.profile_visits(created_at);

ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visits not visible to users" ON public.profile_visits FOR SELECT USING (false);
