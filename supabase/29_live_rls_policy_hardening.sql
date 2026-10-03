DO $$
DECLARE
  target_table TEXT;
  existing_policy RECORD;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'activities',
    'activity_participants',
    'best_photos',
    'daily_streaks',
    'daily_swipe_limits',
    'date_feedbacks',
    'icebreaker_answers',
    'icebreaker_questions',
    'plans',
    'profile_prompts',
    'profile_stats',
    'promo_codes',
    'purchase_receipts',
    'quests',
    'social_integrations',
    'unmatches',
    'user_devices',
    'user_quests',
    'user_ratings',
    'user_stories'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', target_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', target_table);

      FOR existing_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', existing_policy.policyname, target_table);
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

GRANT SELECT ON TABLE public.activities TO authenticated;
CREATE POLICY "activities_authenticated_active_read"
  ON public.activities FOR SELECT TO authenticated
  USING (status = 'active' AND event_date > NOW());

GRANT SELECT, INSERT, DELETE ON TABLE public.activity_participants TO authenticated;
CREATE POLICY "activity_participants_read_own"
  ON public.activity_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);
CREATE POLICY "activity_participants_join_own"
  ON public.activity_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "activity_participants_leave_own"
  ON public.activity_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.best_photos TO authenticated;
CREATE POLICY "best_photos_read_own"
  ON public.best_photos FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.daily_streaks TO authenticated;
CREATE POLICY "daily_streaks_read_own"
  ON public.daily_streaks FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.daily_swipe_limits TO authenticated;
CREATE POLICY "daily_swipe_limits_read_own"
  ON public.daily_swipe_limits FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT, INSERT ON TABLE public.date_feedbacks TO authenticated;
CREATE POLICY "date_feedbacks_read_own"
  ON public.date_feedbacks FOR SELECT TO authenticated
  USING (reporter_id = auth.uid()::text);
CREATE POLICY "date_feedbacks_insert_own"
  ON public.date_feedbacks FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.icebreaker_answers TO authenticated;
CREATE POLICY "icebreaker_answers_manage_own"
  ON public.icebreaker_answers FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.icebreaker_questions TO authenticated;
CREATE POLICY "icebreaker_questions_authenticated_read"
  ON public.icebreaker_questions FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON TABLE public.plans TO authenticated;
CREATE POLICY "plans_authenticated_read"
  ON public.plans FOR SELECT TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_prompts TO authenticated;
CREATE POLICY "profile_prompts_manage_own"
  ON public.profile_prompts FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.profile_stats TO authenticated;
CREATE POLICY "profile_stats_read_own"
  ON public.profile_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.quests TO authenticated;
CREATE POLICY "quests_authenticated_read"
  ON public.quests FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON TABLE public.social_integrations TO authenticated;
CREATE POLICY "social_integrations_read_own"
  ON public.social_integrations FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT, INSERT ON TABLE public.unmatches TO authenticated;
CREATE POLICY "unmatches_read_own"
  ON public.unmatches FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);
CREATE POLICY "unmatches_insert_own"
  ON public.unmatches FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.user_quests TO authenticated;
CREATE POLICY "user_quests_read_own"
  ON public.user_quests FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT ON TABLE public.user_ratings TO authenticated;
CREATE POLICY "user_ratings_read_own"
  ON public.user_ratings FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

GRANT SELECT, INSERT, DELETE ON TABLE public.user_stories TO authenticated;
CREATE POLICY "user_stories_read_active"
  ON public.user_stories FOR SELECT TO authenticated
  USING (expires_at > NOW());
CREATE POLICY "user_stories_insert_own"
  ON public.user_stories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_stories_delete_own"
  ON public.user_stories FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);
