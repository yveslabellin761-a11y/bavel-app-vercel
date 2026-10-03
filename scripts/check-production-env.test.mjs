import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';

const checkerPath = fileURLToPath(new URL('./check-production-env.mjs', import.meta.url));
const isolatedCwd = mkdtempSync(join(tmpdir(), 'bavel-production-env-test-'));
const baseEnv = {
  NODE_ENV: 'production',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'public-anon-key-for-tests',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-for-tests',
  JWT_SECRET: 'a-secure-random-test-secret-with-more-than-32-characters',
  FRONTEND_URL: 'https://bavel.test-domain.net',
  UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-redis-token',
  SENTRY_DSN: 'https://publickey@o123.ingest.sentry.io/456',
  VITE_SENTRY_DSN: 'https://publickey@o123.ingest.sentry.io/789',
  STRIPE_SECRET_KEY: 'sk_live_testconfig',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_configuration_123456789'
};

function runChecker(overrides = {}) {
  const env = { ...process.env, ...baseEnv, ...overrides };
  if (!Object.hasOwn(overrides, 'APP_URL')) delete env.APP_URL;
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[name];
  }
  return spawnSync(process.execPath, [checkerPath], { encoding: 'utf8', env, cwd: isolatedCwd });
}

after(() => rmSync(isolatedCwd, { recursive: true, force: true }));

test('accepts production configuration with Upstash and both Sentry DSNs', () => {
  const result = runChecker();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Production configuration passed/);
});

test('rejects a UUID JWT secret and ignores the unused legacy APP_URL', () => {
  const uuidSecret = runChecker({ JWT_SECRET: '00000000-0000-4000-8000-000000000000' });
  assert.equal(uuidSecret.status, 1);
  assert.match(uuidSecret.stderr, /must not be a UUID/);

  const obsoleteUrl = runChecker({ APP_URL: 'MY_APP_URL' });
  assert.equal(obsoleteUrl.status, 0, obsoleteUrl.stderr);
});

test('rejects missing distributed rate limiting or monitoring configuration', () => {
  for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SENTRY_DSN', 'VITE_SENTRY_DSN']) {
    const result = runChecker({ [name]: undefined });
    assert.equal(result.status, 1, `${name} must be required`);
    assert.match(result.stderr, new RegExp(`${name} is missing`));
  }
});

test('rejects non-HTTPS monitoring and frontend URLs', () => {
  const result = runChecker({
    FRONTEND_URL: 'https://MY_APP_URL',
    SENTRY_DSN: 'http://publickey@sentry.example/123'
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FRONTEND_URL must be an HTTPS URL|placeholder/);
  assert.match(result.stderr, /SENTRY_DSN must be a valid HTTPS Sentry DSN/);
});

test('rejects a placeholder frontend hostname', () => {
  const result = runChecker({ FRONTEND_URL: 'https://bavel.example' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FRONTEND_URL must be an HTTPS URL/);
});

test('rejects example DSNs and unconfigured Upstash placeholders', () => {
  const result = runChecker({
    UPSTASH_REDIS_REST_URL: 'https://...',
    SENTRY_DSN: 'https://clé-publique@o000000.ingest.sentry.io/000000'
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /UPSTASH_REDIS_REST_URL still contains a template value/);
  assert.match(result.stderr, /SENTRY_DSN still contains a template value/);
});

test('requires paired legacy Google client credentials when either is configured', () => {
  const result = runChecker({ GOOGLE_CLIENT_ID: 'legacy-client-id' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /provider configuration incomplete: GOOGLE_CLIENT_ID \+ GOOGLE_CLIENT_SECRET/);
});

test('requires a complete live payment provider for production', () => {
  const noProvider = runChecker({ STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined });
  assert.equal(noProvider.status, 1);
  assert.match(noProvider.stderr, /configure at least one complete payment provider/);

  const testModeStripe = runChecker({ STRIPE_SECRET_KEY: 'sk_test_not_for_production' });
  assert.equal(testModeStripe.status, 1);
  assert.match(testModeStripe.stderr, /must be a live-mode Stripe secret key/);
});
