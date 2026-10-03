-- ================================================================
-- SUPABASE PRODUCTION SCHEMA - PART 4: SECURE RLS POLICIES
-- ================================================================

-- COMPREHENSIVE ROW LEVEL SECURITY POLICIES
-- These policies ensure server-side enforcement of authorization

-- ===== PROFILES TABLE =====
DROP POLICY IF EXISTS "Profiles are viewable by all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT 
  USING (is_suspended = false AND is_verified = true);

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_own_suspended" ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND id = id);

CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE 
  USING (auth.uid() = id);

-- ===== SWIPES TABLE =====
DROP POLICY IF EXISTS "Swipes are viewable by all" ON public.swipes;

CREATE POLICY "swipes_select_own" ON public.swipes FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = target_id);

CREATE POLICY "swipes_insert_own" ON public.swipes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "swipes_update_own" ON public.swipes FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "swipes_delete_own" ON public.swipes FOR DELETE 
  USING (auth.uid() = user_id);

-- ===== MATCHES TABLE =====
CREATE POLICY "matches_select_own" ON public.matches FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "matches_insert_own" ON public.matches FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "matches_update_own" ON public.matches FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "matches_delete_own" ON public.matches FOR DELETE 
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- ===== MESSAGES TABLE =====
CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_own_read" ON public.messages FOR UPDATE 
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND receiver_id = receiver_id);

CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE 
  USING (auth.uid() = sender_id);

-- ===== BLOCKS TABLE =====
CREATE POLICY "blocks_select_own" ON public.blocks FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = blocked_user_id);

CREATE POLICY "blocks_insert_own" ON public.blocks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "blocks_delete_own" ON public.blocks FOR DELETE 
  USING (auth.uid() = user_id);

-- ===== REPORTS TABLE =====
CREATE POLICY "reports_select_own" ON public.reports FOR SELECT 
  USING (auth.uid() = reporter_id);

CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_update_own_status" ON public.reports FOR UPDATE 
  USING (auth.uid() = reporter_id)
  WITH CHECK (auth.uid() = reporter_id);

-- ===== NOTIFICATIONS TABLE =====
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own_read" ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE 
  USING (auth.uid() = user_id);

-- ===== PUSH SUBSCRIPTIONS TABLE =====
CREATE POLICY "subscriptions_select_own" ON public.push_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON public.push_subscriptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_delete_own" ON public.push_subscriptions FOR DELETE 
  USING (auth.uid() = user_id);

-- ===== USER CREDITS TABLE =====
CREATE POLICY "credits_select_own" ON public.user_credits FOR SELECT 
  USING (auth.uid() = user_id);

-- ===== TRANSACTIONS TABLE =====
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- ===== VERIFICATIONS TABLE =====
CREATE POLICY "verifications_select_own" ON public.verifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "verifications_insert_own" ON public.verifications FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ===== DATA REQUESTS TABLE =====
CREATE POLICY "data_requests_insert_own" ON public.data_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ===== PROFILE VISITS =====
CREATE POLICY "profile_visits_insert_own" ON public.profile_visits FOR INSERT 
  WITH CHECK (auth.uid() = visitor_id);

-- Create helper functions for authorization
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create audit trigger
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, event_type, description, metadata)
  VALUES (auth.uid(), TG_TABLE_NAME || '_' || TG_OP, jsonb_build_object('old', OLD, 'new', NEW)::text, '{}');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for common queries
CREATE INDEX idx_profiles_not_suspended ON public.profiles(id) 
  WHERE is_suspended = false;

CREATE INDEX idx_messages_unread ON public.messages(receiver_id) 
  WHERE is_read = false;

CREATE INDEX idx_matches_unarchived ON public.matches(user_id) 
  WHERE is_archived = false;

CREATE INDEX idx_notifications_unread ON public.notifications(user_id) 
  WHERE is_read = false;
