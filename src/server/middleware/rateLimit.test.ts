import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createRateLimiter, createUpstashRateLimitStore, verifyRateLimitStoreConnectivity } from './rateLimit';

async function withServer<T>(handler: express.RequestHandler, run: (url: string) => Promise<T>) {
  const app = express();
  app.use(handler);
  app.get('/', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('uses Upstash atomic fixed-window increments without exposing the client IP in Redis keys', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const store = createUpstashRateLimitStore('https://example.upstash.io/', 'test-token', async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return Response.json([{ result: [4, 45_000] }]);
  });

  const result = await store.consume('api_global:203.0.113.8', 60_000);

  assert.equal(requestUrl, 'https://example.upstash.io/pipeline');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(new Headers(requestInit?.headers).get('authorization'), 'Bearer test-token');
  const [[command, script, keyCount, redisKey, ttl]] = JSON.parse(String(requestInit?.body));
  assert.equal(command, 'EVAL');
  assert.match(script, /redis\.call\('INCR'/);
  assert.equal(keyCount, '1');
  assert.match(redisKey, /^bavel:rate-limit:[a-f0-9]{64}$/);
  assert.equal(redisKey.includes('203.0.113.8'), false);
  assert.equal(ttl, '60000');
  assert.equal(result.count, 4);
  assert.ok(result.resetTime > Date.now() + 44_000);
});

test('rejects non-HTTPS Redis endpoints and malformed store responses', async () => {
  assert.throws(() => createUpstashRateLimitStore('http://example.upstash.io', 'test-token'), /HTTPS/);

  const store = createUpstashRateLimitStore('https://example.upstash.io', 'test-token', async () =>
    Response.json([{ error: 'invalid command' }])
  );
  await assert.rejects(store.consume('api:client', 60_000), /invalid counter/);
});

test('propagates shared-store HTTP failures so middleware can fail closed', async () => {
  const store = createUpstashRateLimitStore(
    'https://example.upstash.io',
    'test-token',
    async () => new Response('unavailable', { status: 503 })
  );
  await assert.rejects(store.consume('api:client', 60_000), /HTTP 503/);
});

test('probes the shared rate-limit store before production startup', async () => {
  let probedKey = '';
  let probeWindow = 0;
  await verifyRateLimitStoreConnectivity({
    async consume(key, windowMs) {
      probedKey = key;
      probeWindow = windowMs;
      return { count: 1, resetTime: Date.now() + windowMs };
    }
  });

  assert.match(probedKey, /^startup-probe:[0-9a-f-]{36}$/);
  assert.equal(probeWindow, 60_000);
});

test('returns 429 with retry guidance after the configured request limit', async () => {
  let count = 0;
  const store = {
    async consume() {
      count += 1;
      return { count, resetTime: Date.now() + 60_000 };
    }
  };

  await withServer(createRateLimiter(1, 60_000, 'test', store), async (url) => {
    assert.equal((await fetch(url)).status, 200);
    const blocked = await fetch(url);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.equal((await blocked.json()).error, 'TOO_MANY_REQUESTS');
  });
});

test('returns 503 rather than bypassing rate limits when the store fails', async () => {
  const store = {
    async consume() {
      throw new Error('store offline');
    }
  };

  await withServer(createRateLimiter(1, 60_000, 'test', store), async (url) => {
    const response = await fetch(url);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'RATE_LIMIT_UNAVAILABLE');
  });
});
