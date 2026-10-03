import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const migrationDir = path.join(root, 'supabase');
const expected = [
  '01_base_schema.sql',
  '02_security_monetization.sql',
  '03_moderation_compliance.sql',
  '04_rls_policies.sql',
  '05_views_functions.sql',
  '06_phase2_media_presence.sql',
  '07_phase4_trust.sql',
  '08_phase5_advanced.sql',
  '09_bavel_ai_product.sql',
  '10_legacy_schema_compatibility.sql',
  '11_payment_orders.sql',
  '12_international_location.sql',
  '13_runtime_realtime.sql',
  '14_badoo_features.sql',
  '15_passkeys.sql',
  '16_notification_preferences.sql',
  '17_admin_operations.sql',
  '18_support.sql',
  '19_admin_settings.sql',
  '20_admin_runtime.sql',
  '21_user_activity.sql',
  '22_private_chat_media.sql',
  '23_discovery_and_chat_hardening.sql',
  '24_private_profile_photos.sql',
  '25_profile_details_jsonb.sql',
  '26_profile_photo_avatar_compatibility.sql',
  '27_public_schema_rls_hardening.sql',
  '28_profile_storage_and_security_repair.sql',
  '29_profile_photo_verification.sql',
  '29_live_rls_policy_hardening.sql',
  '30_spatial_reference_rls.sql',
  '31_user_roles_service_only.sql',
  '32_monetization_rls_hardening.sql',
  '33_remove_client_bypass_privileges.sql',
  '34_activity_messages_policy_repair.sql',
  '35_payment_catalog_and_gamification_rewards.sql'
];

const missing = expected.filter((file) => !fs.existsSync(path.join(migrationDir, file)));
if (missing.length) {
  console.error(`Missing migration files:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}

for (const file of expected) {
  const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8').trim();
  if (!sql || !/create|alter|insert|update|drop|revoke/i.test(sql)) {
    console.error(`Migration appears empty or invalid: ${file}`);
    process.exit(1);
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Migration files are present, but remote verification requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
      'Apply the migrations in Supabase, then rerun this command with deployment secrets.'
  );
  process.exit(2);
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
const headers = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
};

async function checkColumn(table, column) {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', column);
  url.searchParams.set('limit', '0');
  const response = await fetch(url, { headers });
  if (response.ok) return null;
  const details = await response.json().catch(() => null);
  return typeof details?.message === 'string' ? details.message : `HTTP ${response.status}`;
}

const resources = [
  {
    table: 'profiles',
    columns: ['id', 'email', 'name', 'onboarding_completed', 'role'],
    migration: 'supabase/10_legacy_schema_compatibility.sql'
  },
  {
    table: 'profiles',
    columns: ['details'],
    migration: 'supabase/25_profile_details_jsonb.sql'
  },
  {
    table: 'profiles',
    columns: ['photos'],
    migration: 'supabase/06_phase2_media_presence.sql'
  },
  {
    table: 'profiles',
    columns: ['avatar_url'],
    migration: 'supabase/28_profile_storage_and_security_repair.sql'
  },
  {
    table: 'profiles',
    columns: ['is_verified'],
    migration: 'supabase/29_profile_photo_verification.sql'
  },
  {
    table: 'user_security',
    columns: ['user_id', 'two_factor_secret'],
    migration: 'supabase/28_profile_storage_and_security_repair.sql'
  },
  {
    table: 'messages',
    columns: [
      'sender_id',
      'receiver_id',
      'media_url',
      'is_ephemeral',
      'is_private_content',
      'media_viewed_at',
      'media_expires_at',
      'is_read',
      'created_at'
    ],
    migration: 'supabase/23_discovery_and_chat_hardening.sql'
  },
  {
    table: 'blocks',
    columns: ['user_id', 'blocked_user_id'],
    migration: 'supabase/23_discovery_and_chat_hardening.sql'
  },
  {
    table: 'auth_passkeys',
    columns: ['user_id', 'credential_id', 'public_key', 'counter'],
    migration: 'supabase/15_passkeys.sql'
  },
  {
    table: 'passkey_challenges',
    columns: ['id', 'user_id', 'type', 'challenge', 'expires_at'],
    migration: 'supabase/15_passkeys.sql'
  },
  {
    table: 'matches',
    columns: ['user_id', 'matched_user_id'],
    migration: 'supabase/10_legacy_schema_compatibility.sql'
  },
  {
    table: 'private_media_cleanup_queue',
    columns: ['object_path', 'requested_at'],
    migration: 'supabase/22_private_chat_media.sql'
  },
  {
    table: 'user_privacy_settings',
    columns: ['user_id', 'show_online_status', 'show_distance', 'profile_paused'],
    migration: 'supabase/23_discovery_and_chat_hardening.sql'
  },
  {
    table: 'credits',
    columns: ['user_id', 'balance', 'tier', 'premium_expires_at'],
    migration: 'supabase/32_monetization_rls_hardening.sql'
  },
  {
    table: 'payment_orders',
    columns: ['user_id', 'provider_reference', 'amount', 'currency', 'credits', 'product_type', 'status'],
    migration: 'supabase/32_monetization_rls_hardening.sql'
  },
  {
    table: 'credit_operations',
    columns: ['user_id', 'reference_id', 'amount', 'operation_type', 'created_at'],
    migration: 'supabase/32_monetization_rls_hardening.sql'
  },
  {
    table: 'profile_photo_verification_challenges',
    columns: [
      'id',
      'user_id',
      'nonce_hash',
      'profile_fingerprint',
      'challenge_type',
      'status',
      'expires_at',
      'completed_at'
    ],
    migration: 'supabase/29_profile_photo_verification.sql'
  }
];

const checks = await Promise.all(
  resources.flatMap(({ table, columns, migration }) =>
    columns.map(async (column) => ({
      table,
      column,
      migration,
      error: await checkColumn(table, column)
    }))
  )
);
const failures = checks.filter((check) => check.error);
for (const migration of [...new Set(failures.map((failure) => failure.migration))]) {
  const migrationFailures = failures.filter((failure) => failure.migration === migration);
  const missingFields = migrationFailures.map(({ table, column }) => `${table}.${column}`).join(', ');
  const details = [...new Set(migrationFailures.map(({ error }) => error))].join('; ');
  console.error(`${migration} required for ${missingFields}. Remote reports: ${details}`);
}

const legacyUserIdError = await checkColumn('profiles', 'user_id');
if (legacyUserIdError) {
  console.log('Canonical profiles.id is active; legacy profiles.user_id is absent.');
} else {
  console.error('Legacy profiles.user_id remains. Apply supabase/10_legacy_schema_compatibility.sql to remove it.');
  process.exitCode = 1;
}

const legacyMatchProfileIdError = await checkColumn('matches', 'profile_id');
if (legacyMatchProfileIdError) {
  console.log('Canonical matches.matched_user_id is active; legacy matches.profile_id is absent.');
} else {
  console.error('Legacy matches.profile_id remains. Apply supabase/10_legacy_schema_compatibility.sql to remove it.');
  process.exitCode = 1;
}

const profileIdError = checks.find(({ table, column }) => table === 'profiles' && column === 'id')?.error;
if (!profileIdError) {
  const nullIdsUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  nullIdsUrl.searchParams.set('select', 'id');
  nullIdsUrl.searchParams.set('id', 'is.null');
  nullIdsUrl.searchParams.set('limit', '1');
  const nullIdsResponse = await fetch(nullIdsUrl, { headers });
  if (!nullIdsResponse.ok) {
    console.error(
      `Supabase profile identity check failed (${nullIdsResponse.status}). Review supabase/10_legacy_schema_compatibility.sql.`
    );
    process.exitCode = 1;
  } else if ((await nullIdsResponse.json()).length > 0) {
    console.error(
      'Supabase contains profiles without canonical UUID ids. Apply the safe backfill in ' +
        'supabase/10_legacy_schema_compatibility.sql and resolve any remaining legacy rows before deploying.'
    );
    process.exitCode = 1;
  }
}

const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/private-chat-media`, { headers });
if (!bucketResponse.ok) {
  const details = await bucketResponse.json().catch(() => null);
  const message = typeof details?.message === 'string' ? ` ${details.message}` : '';
  console.error(
    `Private Storage bucket is not ready (${bucketResponse.status}). Apply supabase/22_private_chat_media.sql.${message}`
  );
  process.exitCode = 1;
}

const profilePhotosBucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/profile-photos`, { headers });
if (!profilePhotosBucketResponse.ok) {
  const details = await profilePhotosBucketResponse.json().catch(() => null);
  const message = typeof details?.message === 'string' ? ` ${details.message}` : '';
  console.error(
    `Profile photos Storage bucket is not ready (${profilePhotosBucketResponse.status}). Apply supabase/28_profile_storage_and_security_repair.sql.${message}`
  );
  process.exitCode = 1;
} else {
  const bucket = await profilePhotosBucketResponse.json().catch(() => null);
  if (bucket?.public !== false) {
    console.error(
      'Profile photos bucket is still public. Apply supabase/28_profile_storage_and_security_repair.sql before deployment.'
    );
    process.exitCode = 1;
  }
  if (bucket?.file_size_limit !== 10485760) {
    console.error(
      'Profile photos bucket must enforce the 10 MiB upload limit. Apply supabase/28_profile_storage_and_security_repair.sql before deployment.'
    );
    process.exitCode = 1;
  }
  const allowedMimeTypes = Array.isArray(bucket?.allowed_mime_types) ? bucket.allowed_mime_types : [];
  if (
    !['image/jpeg', 'image/png', 'image/webp'].every((type) => allowedMimeTypes.includes(type)) ||
    allowedMimeTypes.some((type) => !['image/jpeg', 'image/png', 'image/webp'].includes(type))
  ) {
    console.error(
      'Profile photos bucket must accept only JPEG, PNG, and WebP images. Apply supabase/28_profile_storage_and_security_repair.sql before deployment.'
    );
    process.exitCode = 1;
  }
}

if (failures.length) process.exitCode = 1;
if (process.exitCode === 1) process.exit(1);

console.log(
  `Found ${expected.length} migration files and validated required remote columns and the profile-photo bucket. ` +
    'This check does not verify migration history or RLS policies; run scripts/verify-supabase-rls.sql in Supabase SQL Editor.'
);
