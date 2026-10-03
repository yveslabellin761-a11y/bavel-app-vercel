import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dispatchPushSubscriptions } from './pushDelivery.js';

describe('push delivery results', () => {
  const subscriptions = [{ endpoint: 'https://push.example.test/one' }, { endpoint: 'https://push.example.test/two' }];

  it('does not report a delivery when there are no subscriptions', async () => {
    const result = await dispatchPushSubscriptions(
      [],
      async () => {},
      async () => {}
    );

    assert.deepEqual(result, {
      status: 'no_subscriptions',
      subscriptionCount: 0,
      acceptedCount: 0,
      failedCount: 0,
      expiredCount: 0
    });
  });

  it('reports provider acceptance, not device delivery', async () => {
    const result = await dispatchPushSubscriptions(
      subscriptions,
      async () => {},
      async () => {}
    );

    assert.equal(result.status, 'accepted');
    assert.equal(result.acceptedCount, 2);
    assert.equal(result.failedCount, 0);
  });

  it('reports partial failures and removes expired subscriptions', async () => {
    const removed: string[] = [];
    const result = await dispatchPushSubscriptions(
      subscriptions,
      async (subscription) => {
        if (subscription === subscriptions[0]) throw Object.assign(new Error('expired'), { statusCode: 410 });
      },
      async (subscription) => {
        removed.push(subscription.endpoint);
      }
    );

    assert.equal(result.status, 'partial_failure');
    assert.equal(result.acceptedCount, 1);
    assert.equal(result.failedCount, 1);
    assert.equal(result.expiredCount, 1);
    assert.deepEqual(removed, [subscriptions[0].endpoint]);
  });

  it('reports failure when every provider request fails', async () => {
    const result = await dispatchPushSubscriptions(
      subscriptions,
      async () => {
        throw new Error('provider unavailable');
      },
      async () => {}
    );

    assert.equal(result.status, 'failed');
    assert.equal(result.acceptedCount, 0);
    assert.equal(result.failedCount, 2);
  });
});
