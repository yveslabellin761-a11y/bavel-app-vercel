import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const readSql = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('sensitive security and moderation tables are not exposed through permissive API policies', async () => {
  const [securitySql, moderationSql, hardeningSql] = await Promise.all([
    readSql('supabase/02_security_monetization.sql'),
    readSql('supabase/03_moderation_compliance.sql'),
    readSql('supabase/27_public_schema_rls_hardening.sql')
  ]);

  assert.doesNotMatch(securitySql, /CREATE POLICY "Admins can view actions"[^;]*USING\s*\(\s*true\s*\)/i);
  assert.match(securitySql, /REVOKE ALL ON TABLE public\.admin_actions FROM PUBLIC, anon, authenticated/i);
  assert.match(securitySql, /GRANT ALL ON TABLE public\.admin_actions TO service_role/i);
  assert.doesNotMatch(moderationSql, /CREATE POLICY "Moderators can view queue"[^;]*USING\s*\(\s*true\s*\)/i);
  assert.match(moderationSql, /REVOKE ALL ON TABLE public\.moderation_queue FROM PUBLIC, anon, authenticated/i);
  assert.doesNotMatch(moderationSql, /CREATE POLICY "Verification status is public"[^;]*USING\s*\(\s*true\s*\)/i);
  assert.match(
    moderationSql,
    /REVOKE ALL ON TABLE public\.profile_verification_status FROM PUBLIC, anon, authenticated/i
  );

  for (const table of [
    'admin_actions',
    'moderation_queue',
    'profile_verification_status',
    'user_security',
    'user_accounts'
  ]) {
    assert.match(hardeningSql, new RegExp(`'${table}'`));
  }
  assert.match(hardeningSql, /DROP POLICY IF EXISTS "profiles_select_public" ON public\.profiles/i);
});

test('standalone production migration enables RLS and removes direct access to internal records', async () => {
  const migration = await readSql('production-migration.sql');

  for (const table of ['reset_tokens', 'user_passwords', 'user_security', 'user_accounts', 'rate_limits']) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(migration, new RegExp(`public\\.${table}`, 'g'));
  }
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT ALL ON TABLE[\s\S]*TO service_role/);
});

test('legacy likes, matches and messages have row-level security enabled', async () => {
  const [legacySchema, privatePhotos] = await Promise.all([
    readSql('supabase_schema.sql'),
    readSql('supabase/24_private_profile_photos.sql')
  ]);
  assert.doesNotMatch(
    legacySchema,
    /CREATE POLICY "Les profils sont visibles par tout le monde\."[\s\S]*?USING\s*\(\s*true\s*\)/i
  );
  assert.match(legacySchema, /VALUES \('profile-photos', 'profile-photos', false,/i);
  assert.doesNotMatch(legacySchema, /VALUES \('avatars', 'avatars', true\)/i);
  assert.match(privatePhotos, /SET public = false/i);
  assert.match(privatePhotos, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/i);
  assert.doesNotMatch(
    privatePhotos,
    /FOR SELECT TO authenticated[\s\S]*?USING\s*\(\s*bucket_id = 'profile-photos'\s*\)/i
  );
  for (const table of ['likes', 'matches', 'messages']) {
    assert.match(legacySchema, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
});

test('forward repair migration grants profile-photo storage access only within each owner folder', async () => {
  const migration = await readSql('supabase/28_profile_storage_and_security_repair.sql');

  assert.match(migration, /ADD COLUMN IF NOT EXISTS avatar_url TEXT/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.user_security/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.user_security FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /SET public = false/i);
  for (const operation of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert.match(
      migration,
      new RegExp(
        `ON storage\\.objects\\s+FOR ${operation}[\\s\\S]*?bucket_id = 'profile-photos'[\\s\\S]*?storage\\.foldername\\(name\\)\\)\\[1\\] = auth\\.uid\\(\\)::text`,
        'i'
      )
    );
  }
});

test('live RLS hardening removes open policies and restricts user-owned rows and sensitive writes', async () => {
  const migration = await readSql('supabase/29_live_rls_policy_hardening.sql');

  assert.match(migration, /REVOKE ALL ON TABLE public\.%I FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /DROP POLICY %I ON public\.%I/i);
  for (const table of [
    'daily_streaks',
    'daily_swipe_limits',
    'date_feedbacks',
    'icebreaker_answers',
    'profile_prompts',
    'profile_stats',
    'purchase_receipts',
    'social_integrations',
    'user_devices',
    'user_quests',
    'user_ratings'
  ]) {
    assert.match(migration, new RegExp(`'${table}'`));
  }
  assert.match(migration, /daily_streaks_read_own[\s\S]*?user_id = auth\.uid\(\)::text/i);
  assert.match(migration, /date_feedbacks_insert_own[\s\S]*?reporter_id = auth\.uid\(\)::text/i);
  assert.match(migration, /user_stories_insert_own[\s\S]*?user_id = auth\.uid\(\)::text/i);
  assert.doesNotMatch(
    migration,
    /GRANT\\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*ON TABLE public\\.(?:purchase_receipts|user_devices|daily_swipe_limits|daily_streaks|user_quests|user_ratings) TO authenticated/i
  );
});

test('PostGIS reference metadata stays outside public and cannot be modified by client roles', async () => {
  const migration = await readSql('supabase/30_spatial_reference_rls.sql');
  assert.match(migration, /to_regclass\('public\.spatial_ref_sys'\) IS NOT NULL/i);
  assert.match(migration, /to_regclass\('extensions\.spatial_ref_sys'\) IS NULL/i);
  assert.match(migration, /has_table_privilege\('anon', 'extensions\.spatial_ref_sys', 'TRUNCATE'\)/i);
  assert.match(migration, /has_table_privilege\('anon', 'extensions\.spatial_ref_sys', 'REFERENCES'\)/i);
  assert.match(migration, /has_table_privilege\('anon', 'extensions\.spatial_ref_sys', 'TRIGGER'\)/i);
  assert.match(migration, /has_table_privilege\('authenticated', 'extensions\.spatial_ref_sys', 'INSERT'\)/i);
  assert.doesNotMatch(migration, /ALTER TABLE public\.spatial_ref_sys/i);
});

test('user role assignments are inaccessible to client roles', async () => {
  const migration = await readSql('supabase/31_user_roles_service_only.sql');
  assert.match(migration, /ALTER TABLE public\.user_roles ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.user_roles FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE public\.user_roles TO service_role/i);
  assert.match(migration, /DROP POLICY %I ON public\.user_roles/i);
});

test('photo verification stores challenge metadata only and reserves badge updates for the server', async () => {
  const [numbered, timestamped] = await Promise.all([
    readSql('supabase/29_profile_photo_verification.sql'),
    readSql('supabase/migrations/20260930125800_profile_photo_verification.sql')
  ]);

  assert.equal(numbered, timestamped);
  assert.match(numbered, /profile_photo_verification_challenges ENABLE ROW LEVEL SECURITY/i);
  assert.match(
    numbered,
    /REVOKE ALL ON TABLE public\.profile_photo_verification_challenges FROM PUBLIC, anon, authenticated/i
  );
  assert.match(numbered, /GRANT ALL ON TABLE public\.profile_photo_verification_challenges TO service_role/i);
  assert.match(numbered, /profile_fingerprint TEXT NOT NULL/i);
  assert.doesNotMatch(numbered, /\b(?:selfie|frame|image|embedding)_data\b/i);
  assert.match(numbered, /complete_profile_photo_verification\(UUID, UUID\)[\s\S]*TO service_role/i);
  assert.match(numbered, /NEW\.photos IS DISTINCT FROM OLD\.photos[\s\S]*NEW\.is_verified := false/i);
});

test('manual RLS verification query checks open policies and PostGIS write grants', async () => {
  const query = await readSql('scripts/verify-supabase-rls.sql');
  assert.match(query, /public_table_rls_disabled/i);
  assert.match(query, /unrestricted_anon_policy/i);
  assert.match(query, /spatial_ref_sys_client_write/i);
  assert.match(query, /client_truncate_privilege/i);
  assert.match(query, /table_name IN \(SELECT tablename FROM pg_tables WHERE schemaname = 'public'\)/i);
  assert.match(query, /information_schema\.role_table_grants/i);
});

test('health endpoint is registered before production SPA fallback', async () => {
  const server = await readSql('server.ts');
  const healthRoute = server.indexOf("app.get('/health'");
  const spaFallback = server.indexOf("app.get('/{*splat}'");

  assert.notEqual(healthRoute, -1);
  assert.notEqual(spaFallback, -1);
  assert.ok(healthRoute < spaFallback, 'health checks must return API status, not the frontend HTML shell');
});

test('health check probes an existing Supabase table', async () => {
  const integration = await readSql('src/lib/serverSupabaseIntegration.ts');

  assert.match(integration, /supabase\.from\('profiles'\)\.select\('id'\)\.limit\(0\)/);
  assert.doesNotMatch(integration, /supabase\.from\('reset_tokens'\)\.select\('id'\)\.limit\(1\)/);
});

test('public tables revoke client privileges that bypass row-level security', async () => {
  const migration = await readSql('supabase/33_remove_client_bypass_privileges.sql');
  assert.match(migration, /REVOKE TRUNCATE, REFERENCES, TRIGGER/i);
  assert.match(migration, /FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /tablename <> 'spatial_ref_sys'/i);
});

test('activity messages require the sender to be a confirmed participant in the same activity', async () => {
  const migration = await readSql('supabase/34_activity_messages_policy_repair.sql');
  assert.match(migration, /REVOKE ALL ON TABLE public\.activity_messages FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT SELECT, INSERT ON TABLE public\.activity_messages TO authenticated/i);
  assert.match(migration, /sender_id = auth\.uid\(\)::text/i);
  assert.match(migration, /participant\.activity_id = activity_messages\.activity_id/i);
  assert.match(migration, /participant\.status = 'going'/i);
  assert.doesNotMatch(migration, /activity_participants\.activity_id = activity_participants\.activity_id/i);
});

test('private chat safety actions are service-only and keep reported image evidence', async () => {
  const migration = await readSql('supabase/36_private_chat_safety_actions.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.message_user_hides/i);
  assert.match(migration, /ALTER TABLE public\.message_user_hides ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.message_user_hides FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /INSERT INTO public\.message_user_hides \(message_id, user_id\)/i);
  assert.match(migration, /p_user_id NOT IN \(target_message\.sender_id, target_message\.receiver_id\)/i);
  assert.match(migration, /p_reporter_id <> target_message\.receiver_id/i);
  assert.match(migration, /INSERT INTO public\.reports[\s\S]*'inappropriate_content'/i);
  assert.match(migration, /ARRAY\[target_message\.media_url\]/i);
  assert.match(migration, /ON CONFLICT \(user_id, blocked_user_id\)/i);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.report_private_chat_image\(UUID, UUID\)[\s\S]*FROM PUBLIC, anon, authenticated/i
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.report_private_chat_image\(UUID, UUID\) TO service_role/i
  );
  assert.match(migration, /evidence_urls @> ARRAY\[OLD\.media_url\]/i);
  assert.match(migration, /NEW\.status IN \('resolved', 'dismissed'\)/i);
});

test('private chat image delivery serves blurred bytes until explicit reveal and preserves voice URLs', async () => {
  const server = await readSql('server.ts');
  const routeStart = server.indexOf("app.get('/api/messages/:messageId/media-url'");
  const routeEnd = server.indexOf("app.post('/api/moderation/text'", routeStart);
  assert.notEqual(routeStart, -1);
  assert.notEqual(routeEnd, -1);
  const mediaRoute = server.slice(routeStart, routeEnd);
  assert.match(mediaRoute, /createBlurredPrivateImagePreview/);
  assert.match(mediaRoute, /req\.query\.reveal !== '1'/);
  assert.match(mediaRoute, /message\.message_type === 'voice'[\s\S]*createSignedUrl/);
  assert.match(mediaRoute, /Cache-Control', 'private, no-store/);
  assert.match(server, /app\.delete\('\/api\/messages\/:messageId\/hide', verifySupabaseToken, requireAuth/);
  assert.match(server, /app\.get\('\/api\/messages\/hidden', verifySupabaseToken, requireAuth/);
  assert.match(server, /app\.post\('\/api\/messages\/:messageId\/private-report', verifySupabaseToken, requireAuth/);
  assert.ok(server.includes("app.post('/api/messages/:messageId/private-report'"));
  assert.ok(server.includes("app.get('/api/admin/reports/:reportId/evidence'"));
});

test('private chat reports remove both directional match rows', async () => {
  const migration = await readSql('supabase/37_private_chat_report_unmatch.sql');
  assert.match(
    migration,
    /DELETE FROM public\.matches[\s\S]*user_id = p_reporter_id AND matched_user_id = target_message\.sender_id[\s\S]*user_id = target_message\.sender_id AND matched_user_id = p_reporter_id/i
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.report_private_chat_image\(UUID, UUID\)[\s\S]*FROM PUBLIC, anon, authenticated/i
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.report_private_chat_image\(UUID, UUID\) TO service_role/i
  );
});

test('timestamped Supabase migrations stay identical to the numbered repair scripts', async () => {
  const pairs = [
    [
      'supabase/28_profile_storage_and_security_repair.sql',
      'supabase/migrations/20260930125000_profile_storage_and_security_repair.sql'
    ],
    ['supabase/29_live_rls_policy_hardening.sql', 'supabase/migrations/20260930125100_live_rls_policy_hardening.sql'],
    ['supabase/30_spatial_reference_rls.sql', 'supabase/migrations/20260930125200_spatial_reference_rls.sql'],
    ['supabase/31_user_roles_service_only.sql', 'supabase/migrations/20260930125300_user_roles_service_only.sql'],
    ['supabase/32_monetization_rls_hardening.sql', 'supabase/migrations/20260930125400_monetization_rls_hardening.sql'],
    [
      'supabase/33_remove_client_bypass_privileges.sql',
      'supabase/migrations/20260930125500_remove_client_bypass_privileges.sql'
    ],
    [
      'supabase/34_activity_messages_policy_repair.sql',
      'supabase/migrations/20260930125600_activity_messages_policy_repair.sql'
    ],
    [
      'supabase/35_payment_catalog_and_gamification_rewards.sql',
      'supabase/migrations/20260930125700_payment_catalog_and_gamification_rewards.sql'
    ],
    ['supabase/29_profile_photo_verification.sql', 'supabase/migrations/20260930125800_profile_photo_verification.sql'],
    ['supabase/36_private_chat_safety_actions.sql', 'supabase/migrations/20261004012300_private_chat_safety_actions.sql'],
    ['supabase/37_private_chat_report_unmatch.sql', 'supabase/migrations/20261004020000_private_chat_report_unmatch.sql']
  ];
  for (const [source, migration] of pairs) {
    assert.equal(await readSql(source), await readSql(migration));
  }
});

test('monetization rows are owner-readable only and all balance-changing functions are service-only', async () => {
  const migration = await readSql('supabase/32_monetization_rls_hardening.sql');
  for (const table of [
    'user_credits',
    'credits',
    'transactions',
    'payments',
    'subscriptions',
    'super_like_quotas',
    'user_inventory',
    'promo_code_redemptions'
  ]) {
    assert.match(migration, new RegExp(`'${table}'`));
  }
  assert.match(migration, /REVOKE ALL ON TABLE public\.%I FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT SELECT ON TABLE public\.%I TO authenticated/i);
  assert.match(migration, /user_id::text = auth\.uid\(\)::text/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.payment_orders/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.credit_operations/i);
  assert.match(migration, /ON CONFLICT \(user_id, reference_id\) DO NOTHING/i);
  assert.match(migration, /PERFORM pg_advisory_xact_lock/i);
  assert.match(
    migration,
    /REVOKE EXECUTE ON FUNCTION public\.record_transaction[\s\S]*FROM PUBLIC, anon, authenticated/i
  );
  assert.match(
    migration,
    /REVOKE EXECUTE ON FUNCTION public\.grant_user_credits[\s\S]*FROM PUBLIC, anon, authenticated/i
  );
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_adjust_user_credits[\s\S]*TO service_role/i);
});
