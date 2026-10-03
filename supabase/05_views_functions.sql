-- ================================================================
-- SUPABASE PRODUCTION SCHEMA - PART 5: VIEWS & FUNCTIONS
-- ================================================================

-- Create useful views for the application

-- 1. VIEW: User feed (profiles user can see)
CREATE OR REPLACE VIEW public.discover_feed AS
SELECT 
  p.id,
  p.email,
  p.username,
  p.name,
  p.avatar_url,
  p.age,
  p.gender,
  p.city,
  p.bio,
  p.photos,
  p.interests,
  p.tier,
  p.is_verified,
  (SELECT COUNT(*) FROM public.swipes WHERE target_id = p.id AND is_liked = true) as likes_count,
  (SELECT COUNT(*) FROM public.profile_visits WHERE visited_user_id = p.id) as visits_count
FROM public.profiles p
WHERE p.is_suspended = false AND p.is_verified = true
ORDER BY p.updated_at DESC;

-- 2. VIEW: User's matches with unread message counts
CREATE OR REPLACE VIEW public.user_matches_summary AS
SELECT 
  m.id,
  m.user_id,
  m.matched_user_id,
  p.username,
  p.avatar_url,
  p.name,
  m.created_at,
  m.last_message_at,
  (SELECT COUNT(*) FROM public.messages 
   WHERE match_id = m.id AND is_read = false AND receiver_id = m.user_id) as unread_count,
  (SELECT content FROM public.messages 
   WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message
FROM public.matches m
JOIN public.profiles p ON m.matched_user_id = p.id
WHERE m.is_archived = false;

-- 3. VIEW: Dashboard stats (for admin)
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE is_verified = true) as verified_users,
  (SELECT COUNT(*) FROM public.profiles WHERE is_suspended = true) as suspended_users,
  (SELECT COUNT(*) FROM public.matches) as total_matches,
  (SELECT COUNT(*) FROM public.swipes WHERE is_liked = true) as total_likes,
  (SELECT COUNT(*) FROM public.reports WHERE status = 'pending') as pending_reports,
  (SELECT COUNT(*) FROM public.sanctions WHERE is_active = true) as active_sanctions;

-- Function to create user credits on signup
CREATE OR REPLACE FUNCTION public.create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, tier)
  VALUES (NEW.id, 100, 'freemium');
  
  INSERT INTO public.user_security (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.profile_verification_status (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles insert to initialize user credits
CREATE TRIGGER init_user_credits
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_credits();

-- Function to record credit transaction
CREATE OR REPLACE FUNCTION public.record_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.transactions (user_id, amount, transaction_type, description, reference_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_reference_id)
  RETURNING id INTO v_transaction_id;
  
  UPDATE public.user_credits 
  SET balance = balance + p_amount
  WHERE user_id = p_user_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply sanction
CREATE OR REPLACE FUNCTION public.apply_sanction(
  p_user_id UUID,
  p_admin_id UUID,
  p_sanction_type TEXT,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sanction_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
  END IF;
  
  INSERT INTO public.sanctions (user_id, admin_id, sanction_type, reason, duration_days, expires_at)
  VALUES (p_user_id, p_admin_id, p_sanction_type, p_reason, p_duration_days, v_expires_at)
  RETURNING id INTO v_sanction_id;
  
  IF p_sanction_type = 'mute' THEN
    UPDATE public.user_security SET is_muted = true, mute_expires_at = v_expires_at
    WHERE user_id = p_user_id;
  ELSIF p_sanction_type = 'shadowban' THEN
    UPDATE public.user_security SET is_shadowbanned = true, shadowban_expires_at = v_expires_at
    WHERE user_id = p_user_id;
  ELSIF p_sanction_type = 'suspension' THEN
    UPDATE public.profiles SET is_suspended = true WHERE id = p_user_id;
  ELSIF p_sanction_type = 'permanent_ban' THEN
    UPDATE public.profiles SET is_suspended = true WHERE id = p_user_id;
  END IF;
  
  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, description, reason)
  VALUES (p_admin_id, p_user_id, 'sanction_applied', p_sanction_type, p_reason);
  
  RETURN v_sanction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can message another user
CREATE OR REPLACE FUNCTION public.can_message(
  p_from_id UUID,
  p_to_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if users have matched
  IF NOT EXISTS (
    SELECT 1 FROM public.matches 
    WHERE (user_id = p_from_id AND matched_user_id = p_to_id)
    OR (user_id = p_to_id AND matched_user_id = p_from_id)
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if either user is muted
  IF EXISTS (
    SELECT 1 FROM public.user_security 
    WHERE user_id = p_from_id AND is_muted = true 
    AND (mute_expires_at IS NULL OR mute_expires_at > NOW())
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if sender is blocked by recipient
  IF EXISTS (
    SELECT 1 FROM public.blocks 
    WHERE user_id = p_to_id AND blocked_user_id = p_from_id
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle match creation (mutual like)
CREATE OR REPLACE FUNCTION public.create_match_if_mutual(
  p_user_id UUID,
  p_target_id UUID
)
RETURNS TABLE(match_id UUID, is_new_match BOOLEAN) AS $$
DECLARE
  v_mutual_like BOOLEAN;
  v_match_id UUID;
BEGIN
  -- Check if target has already liked user
  v_mutual_like := EXISTS(
    SELECT 1 FROM public.swipes 
    WHERE user_id = p_target_id AND target_id = p_user_id AND is_liked = true
  );
  
  IF v_mutual_like THEN
    -- Check if match already exists
    IF NOT EXISTS(
      SELECT 1 FROM public.matches 
      WHERE (user_id = p_user_id AND matched_user_id = p_target_id)
      OR (user_id = p_target_id AND matched_user_id = p_user_id)
    ) THEN
      -- Create new match
      INSERT INTO public.matches (user_id, matched_user_id)
      VALUES (p_user_id, p_target_id)
      RETURNING id INTO v_match_id;
      
      -- Create notifications
      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES 
        (p_user_id, 'match', 'C\'est un match!', 'Vous vous plaisez mutuellement'),
        (p_target_id, 'match', 'C\'est un match!', 'Vous vous plaisez mutuellement');
      
      RETURN QUERY SELECT v_match_id, true;
    ELSE
      -- Match already exists
      SELECT id INTO v_match_id FROM public.matches 
      WHERE (user_id = p_user_id AND matched_user_id = p_target_id)
      OR (user_id = p_target_id AND matched_user_id = p_user_id)
      LIMIT 1;
      
      RETURN QUERY SELECT v_match_id, false;
    END IF;
  ELSE
    -- No mutual like, create notification that someone liked them
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (p_target_id, 'like', 'Vous avez un like!', 'Quelqu\'un vous a aimé');
    
    RETURN QUERY SELECT NULL::UUID, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_sanctions_active ON public.sanctions(user_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_security_muted ON public.user_security(user_id) 
  WHERE is_muted = true;

CREATE INDEX IF NOT EXISTS idx_blocks_user_blocked ON public.blocks(user_id, blocked_user_id);

CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at DESC);

-- Set up cron jobs for maintenance (requires pg_cron extension)
SELECT cron.schedule('cleanup-expired-sanctions', '0 * * * *', 
  'UPDATE public.sanctions SET is_active = false 
   WHERE expires_at < NOW() AND is_active = true');

SELECT cron.schedule('cleanup-expired-sanctions-user-security', '0 * * * *',
  'UPDATE public.user_security 
   SET is_muted = false, is_shadowbanned = false
   WHERE (mute_expires_at < NOW() AND is_muted = true)
   OR (shadowban_expires_at < NOW() AND is_shadowbanned = true)');
