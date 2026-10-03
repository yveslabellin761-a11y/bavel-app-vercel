import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptPath = fileURLToPath(new URL('./prepare-production-env.mjs', import.meta.url));

test('adds missing production keys without changing existing secrets and removes APP_URL', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bavel-env-prepare-'));
  const envPath = join(directory, '.env');
  const existing = [
    'JWT_SECRET=do-not-print-or-change',
    'FRONTEND_URL=https://existing.example.net',
    'UPSTASH_REDIS_REST_URL=https://configured.upstash.io',
    'APP_URL=obsolete',
    ''
  ].join('\n');
  writeFileSync(envPath, existing);

  try {
    const result = spawnSync(process.execPath, [scriptPath], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /do-not-print-or-change/);

    const updated = readFileSync(envPath, 'utf8');
    assert.match(updated, /JWT_SECRET=do-not-print-or-change/);
    assert.match(updated, /FRONTEND_URL=https:\/\/existing\.example\.net/);
    assert.match(updated, /UPSTASH_REDIS_REST_URL=https:\/\/configured\.upstash\.io/);
    assert.match(updated, /UPSTASH_REDIS_REST_TOKEN=""/);
    assert.match(updated, /SENTRY_DSN=""/);
    assert.match(updated, /VITE_SENTRY_DSN=""/);
    assert.doesNotMatch(updated, /^APP_URL=/m);
    assert.equal(statSync(envPath).mode & 0o777, 0o600);

    const repeated = spawnSync(process.execPath, [scriptPath], { cwd: directory, encoding: 'utf8' });
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.equal(readFileSync(envPath, 'utf8'), updated);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
