import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeAuthenticatedUserId, validatePushSubscription } from './pushSecurity.js';

describe('push security helpers', () => {
  it('accepts only a UUID from the authenticated request context', () => {
    assert.equal(
      normalizeAuthenticatedUserId('9fba2a31-8da4-4c22-9ca1-e534d1343522'),
      '9fba2a31-8da4-4c22-9ca1-e534d1343522'
    );
    assert.equal(normalizeAuthenticatedUserId('not-a-user-id'), null);
    assert.equal(normalizeAuthenticatedUserId(null), null);
  });

  it('accepts only secure Web Push endpoints with bounded key material', () => {
    const subscription = {
      endpoint: 'https://push.example.test/subscription',
      keys: { p256dh: 'public-key', auth: 'auth-key' }
    };
    assert.deepEqual(validatePushSubscription(subscription), subscription);
    assert.equal(
      validatePushSubscription({ ...subscription, endpoint: 'http://push.example.test/subscription' }),
      null
    );
    assert.equal(validatePushSubscription({ ...subscription, keys: { p256dh: '', auth: 'auth-key' } }), null);
  });
});
