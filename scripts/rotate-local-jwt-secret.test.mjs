import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptPath = fileURLToPath(new URL('./rotate-local-jwt-secret.mjs', import.meta.url));

test('rotates only the local JWT secret and keeps the env file private', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bavel-jwt-rotate-'));
  const envPath = join(directory, '.env');
  writeFileSync(envPath, 'SUPABASE_URL=https://project.supabase.co\nJWT_SECRET="weak-old-secret"\nPORT=3000\n');

  try {
    const result = spawnSync(process.execPath, [scriptPath], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /JWT_SECRET=[A-Za-z0-9_-]{64}/);

    const updated = readFileSync(envPath, 'utf8');
    const secret = updated.match(/^JWT_SECRET="([A-Za-z0-9_-]+)"$/m)?.[1];
    assert.match(secret || '', /^[A-Za-z0-9_-]{64}$/);
    assert.match(updated, /^SUPABASE_URL=https:\/\/project\.supabase\.co$/m);
    assert.match(updated, /^PORT=3000$/m);
    assert.equal(statSync(envPath).mode & 0o777, 0o600);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('refuses to rotate when the env file has missing or duplicate JWT entries', () => {
  for (const contents of ['PORT=3000\n', 'JWT_SECRET=one\nJWT_SECRET=two\n']) {
    const directory = mkdtempSync(join(tmpdir(), 'bavel-jwt-invalid-'));
    const envPath = join(directory, '.env');
    writeFileSync(envPath, contents);
    try {
      const result = spawnSync(process.execPath, [scriptPath], { cwd: directory, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.equal(readFileSync(envPath, 'utf8'), contents);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});
