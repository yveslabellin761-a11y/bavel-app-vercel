import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { rewardedAdsUnavailable } from './rewardedAds';

test('rejects rewarded-ad credit grants until server-side viewing verification is available', async () => {
  const app = express();
  let creditGrantCalls = 0;
  app.use(express.json());
  app.post('/api/rewards/grant', rewardedAdsUnavailable, (_req, _res) => {
    creditGrantCalls += 1;
  });

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/rewards/grant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rewardType: 'credits', amount: 100 }),
    });
    assert.equal(response.status, 410);
    assert.equal((await response.json()).error, 'REWARDED_ADS_UNAVAILABLE');
    assert.equal(creditGrantCalls, 0);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
