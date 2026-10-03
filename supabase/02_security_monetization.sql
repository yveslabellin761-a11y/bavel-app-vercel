-- ================================================================
-- SUPABASE PRODUCTION SCHEMA - PART 2: SECURITY & MONETIZATION
-- ================================================================

-- 8. USER SECURITY TABLE (2FA, sanctions, account settings)
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
  account_locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_security_user_id ON public.user_security(user_id);
CREATE INDEX idx_user_security_is_muted ON public.user_security(is_muted);
CREATE INDEX idx_user_security_is_shadowbanned ON public.user_security(is_shadowbanned);
CREATE INDEX idx_user_security_account_locked ON public.user_security(account_locked);

ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own security" ON public.user_security;
DROP POLICY IF EXISTS "System can manage security" ON public.user_security;
DROP POLICY IF EXISTS "user security service role only" ON public.user_security;
CREATE POLICY "user security service role only" ON public.user_security
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE public.user_security FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_security TO service_role;

-- 9. CREDITS & TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'freemium' CHECK (tier IN ('freemium', 'extra', 'premium', 'vip')),
  premium_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_user_credits_tier ON public.user_credits(tier);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

-- 10. TRANSACTIONS TABLE (immutable ledger for credits/payments)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_purchase', 'ad_watch', 'daily_login', 'super_like_cost', 'profile_boost', 'refund', 'admin_adjustment')),
  reference_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- 11. PUSH SUBSCRIPTIONS TABLE (for web push notifications)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- 12. VERIFICATION RECORDS (selfie, ID document, phone)
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('selfie', 'id_document', 'phone', 'email')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verifications_user_id ON public.verifications(user_id);
CREATE INDEX idx_verifications_type ON public.verifications(type);
CREATE INDEX idx_verifications_status ON public.verifications(status);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own verifications" ON public.verifications FOR SELECT USING (auth.uid() = user_id);

-- 13. ADMIN ACTIONS LOG (audit trail)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT,
  changes JSONB DEFAULT '{}',
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target_user_id ON public.admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_action_type ON public.admin_actions(action_type);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view actions" ON public.admin_actions;
REVOKE ALL ON TABLE public.admin_actions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_actions TO service_role;

-- 14. SECURITY AUDIT LOG (all sensitive events)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs not visible to users" ON public.audit_logs FOR SELECT USING (false);

-- 15. ACCOUNT DELETION REQUESTS
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  verification_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX idx_account_deletion_requests_status ON public.account_deletion_requests(status);
CREATE INDEX idx_account_deletion_requests_expires_at ON public.account_deletion_requests(expires_at);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deletion request" ON public.account_deletion_requests FOR SELECT USING (auth.uid() = user_id);
