import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checkerPath = fileURLToPath(new URL('./check-native-env.mjs', import.meta.url));
const validSupabaseEnv = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-public-anon-key'
};

function runChecker(apiUrl) {
  return spawnSync(process.execPath, [checkerPath], {
    encoding: 'utf8',
    env: { ...process.env, ...validSupabaseEnv, VITE_API_BASE_URL: apiUrl }
  });
}

test('accepts an HTTPS API origin', () => {
  const result = runChecker('https://api.bavel.app');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /https:\/\/api\.bavel\.app/);
});

test('rejects an unset API origin', () => {
  const result = runChecker('');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /set VITE_API_BASE_URL/);
});

test('rejects insecure, local, placeholder, and non-origin URLs', () => {
  for (const apiUrl of [
    'http://api.bavel.app',
    'https://localhost',
    'https://your-api.example',
    'https://api.bavel.app/v1',
    'https://api.bavel.app?debug=true'
  ]) {
    const result = runChecker(apiUrl);
    assert.equal(result.status, 1, `${apiUrl} should be rejected`);
  }
});

test('rejects missing or unsafe Supabase build configuration', () => {
  for (const [name, value] of [
    ['VITE_SUPABASE_URL', ''],
    ['VITE_SUPABASE_URL', 'http://project.supabase.co'],
    ['VITE_SUPABASE_URL', 'https://your-project.supabase.co'],
    ['VITE_SUPABASE_URL', 'https://project.supabase.co/auth'],
    ['VITE_SUPABASE_ANON_KEY', ''],
    ['VITE_SUPABASE_ANON_KEY', 'your-anon-key-placeholder']
  ]) {
    const result = spawnSync(process.execPath, [checkerPath], {
      encoding: 'utf8',
      env: { ...process.env, ...validSupabaseEnv, VITE_API_BASE_URL: 'https://api.bavel.app', [name]: value }
    });
    assert.equal(result.status, 1, `${name}=${value} should be rejected`);
    assert.match(result.stderr, /Native build blocked/);
  }
});
