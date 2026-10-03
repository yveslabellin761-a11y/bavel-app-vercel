-- ============================================
-- PRODUCTION MIGRATION: Replace in-memory Maps with Supabase
-- ============================================

-- 1. Reset Tokens Table
CREATE TABLE IF NOT EXISTS public.reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5 User Passwords Table
CREATE TABLE IF NOT EXISTS public.user_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.6 User Security Settings Table
CREATE TABLE IF NOT EXISTS public.user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  anti_scam_shield BOOLEAN DEFAULT true,
  warnings_count INTEGER DEFAULT 0,
  is_muted BOOLEAN DEFAULT false,
  is_shadowbanned BOOLEAN DEFAULT false,
  mute_expires_at TIMESTAMP WITH TIME ZONE,
  shadowban_expires_at TIMESTAMP WITH TIME ZONE,
  last_violation_reason TEXT,
  login_attempts INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP WITH TIME ZONE,
  account_locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0;
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS is_shadowbanned BOOLEAN DEFAULT false;
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS mute_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS shadowban_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS last_violation_reason TEXT;

-- 1.7 User Profiles Store Table (temporary migration, will merge with profiles)
CREATE TABLE IF NOT EXISTS public.user_profiles_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  profile JSONB NOT NULL,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.8 Encounters Likes Store Table
CREATE TABLE IF NOT EXISTS public.encounters_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  liked_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, liked_user_id)
);

-- 1.9 Encounters Matches Store Table
CREATE TABLE IF NOT EXISTS public.encounters_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  matched_user_id TEXT NOT NULL,
  match_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, matched_user_id)
);

-- 1.10 User Accounts Table (comprehensive user management)
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'email',
  facebook_id TEXT UNIQUE,
  avatar_url TEXT,
  name TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- 1.11 Account Deletion Requests Table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  reason TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.12 Profile Updates History Table
CREATE TABLE IF NOT EXISTS public.profile_updates_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Security Logs Table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  ip_address TEXT,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Telemetry Table
CREATE TABLE IF NOT EXISTS public.telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  event_type TEXT NOT NULL,
  screen_name TEXT,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Rate Limits Table (temporary, should use Redis in production)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. Add last_active_at to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_inactivity_push_sent TIMESTAMP WITH TIME ZONE;

-- 7. Enable Row Level Security
ALTER TABLE public.reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_updates_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 8. Internal records are accessible only through the server's service-role client.
DROP POLICY IF EXISTS "Users can manage their reset tokens" ON public.reset_tokens;
DROP POLICY IF EXISTS "System can manage user passwords" ON public.user_passwords;
DROP POLICY IF EXISTS "System can manage user security" ON public.user_security;
DROP POLICY IF EXISTS "System can manage user profiles store" ON public.user_profiles_store;
DROP POLICY IF EXISTS "System can manage encounters likes" ON public.encounters_likes;
DROP POLICY IF EXISTS "System can manage encounters matches" ON public.encounters_matches;
DROP POLICY IF EXISTS "System can manage user accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "System can manage account deletion requests" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "System can manage profile updates history" ON public.profile_updates_history;
DROP POLICY IF EXISTS "Users can view their security logs" ON public.security_logs;
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_logs;
DROP POLICY IF EXISTS "Users can view their telemetry" ON public.telemetry;
DROP POLICY IF EXISTS "System can insert telemetry" ON public.telemetry;

REVOKE ALL ON TABLE
  public.reset_tokens,
  public.user_passwords,
  public.user_security,
  public.user_profiles_store,
  public.encounters_likes,
  public.encounters_matches,
  public.user_accounts,
  public.account_deletion_requests,
  public.profile_updates_history,
  public.security_logs,
  public.telemetry,
  public.rate_limits
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public.reset_tokens,
  public.user_passwords,
  public.user_security,
  public.user_profiles_store,
  public.encounters_likes,
  public.encounters_matches,
  public.user_accounts,
  public.account_deletion_requests,
  public.profile_updates_history,
  public.security_logs,
  public.telemetry,
  public.rate_limits
TO service_role;

CREATE POLICY "Users can manage their push subscriptions" 
  ON public.push_subscriptions FOR ALL 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their security logs" 
  ON public.security_logs FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert security logs" 
  ON public.security_logs FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their telemetry" 
  ON public.telemetry FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert telemetry" 
  ON public.telemetry FOR INSERT 
  WITH CHECK (true);

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS reset_tokens_token_idx ON public.reset_tokens(token);
CREATE INDEX IF NOT EXISTS reset_tokens_expires_at_idx ON public.reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS user_passwords_email_idx ON public.user_passwords(email);
CREATE UNIQUE INDEX IF NOT EXISTS user_security_user_id_uidx ON public.user_security(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_store_email_idx ON public.user_profiles_store(email);
CREATE INDEX IF NOT EXISTS encounters_likes_user_id_idx ON public.encounters_likes(user_id);
CREATE INDEX IF NOT EXISTS encounters_likes_liked_user_id_idx ON public.encounters_likes(liked_user_id);
CREATE INDEX IF NOT EXISTS encounters_matches_user_id_idx ON public.encounters_matches(user_id);
CREATE INDEX IF NOT EXISTS encounters_matches_matched_user_id_idx ON public.encounters_matches(matched_user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_accounts_user_id_idx ON public.user_accounts(user_id);
CREATE INDEX IF NOT EXISTS user_accounts_email_idx ON public.user_accounts(email);
CREATE INDEX IF NOT EXISTS user_accounts_facebook_id_idx ON public.user_accounts(facebook_id);
CREATE INDEX IF NOT EXISTS user_accounts_is_active_idx ON public.user_accounts(is_active);
CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS account_deletion_requests_token_idx ON public.account_deletion_requests(token);
CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx ON public.account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS profile_updates_history_user_id_idx ON public.profile_updates_history(user_id);
CREATE INDEX IF NOT EXISTS profile_updates_history_updated_at_idx ON public.profile_updates_history(updated_at);
CREATE INDEX IF NOT EXISTS security_logs_user_id_idx ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS security_logs_created_at_idx ON public.security_logs(created_at);
CREATE INDEX IF NOT EXISTS telemetry_user_id_idx ON public.telemetry(user_id);
CREATE INDEX IF NOT EXISTS telemetry_created_at_idx ON public.telemetry(created_at);
CREATE INDEX IF NOT EXISTS rate_limits_ip_endpoint_idx ON public.rate_limits(ip_address, endpoint);
CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx ON public.rate_limits(expires_at);

-- 10. Enable Realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE security_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry;

-- 11. Cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.reset_tokens WHERE expires_at < NOW();
  DELETE FROM public.rate_limits WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 12. Schedule cleanup (run every hour - requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup-expired-tokens', '0 * * * *', 'SELECT cleanup_expired_tokens()');

-- 13. Update profiles last_active_at trigger
CREATE OR REPLACE FUNCTION update_last_active_at()
RETURNS trigger AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger if not exists
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active_at();