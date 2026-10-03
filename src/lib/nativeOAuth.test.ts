import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNativeOAuthCallbackUrl, NATIVE_OAUTH_REDIRECT_URL } from './nativeOAuth';

test('uses a custom app callback URL registered for native OAuth', () => {
  assert.equal(NATIVE_OAUTH_REDIRECT_URL, 'com.bavel.app://auth/callback');
  assert.equal(isNativeOAuthCallbackUrl(NATIVE_OAUTH_REDIRECT_URL), true);
});

test('rejects callback URLs outside the exact app scheme and path', () => {
  for (const url of [
    'https://bavel.com/auth/callback',
    'com.bavel.app://auth/other',
    'com.bavel.app://other/callback',
    'com.bavel.app://auth/callback/extra',
    'com.bavel.app://user@auth/callback',
    'not a URL'
  ]) {
    assert.equal(isNativeOAuthCallbackUrl(url), false, `${url} must not be accepted`);
  }
});
