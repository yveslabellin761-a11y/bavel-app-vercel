import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import express from 'express';
import { afterEach, test } from 'node:test';
import { createClientCors, createCsrfProtection } from './csrfProtection';

const servers: Server[] = [];

async function request(path: string, headers: Record<string, string> = {}, method = 'POST'): Promise<Response> {
  const app = express();
  app.use('/api', createCsrfProtection('https://bavel.example'));
  app.use('/api', (_req, res) => res.sendStatus(204));
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});

test('allows mutations from the configured origin and rejects other origins', async () => {
  const accepted = await request('/api/action', { origin: 'https://bavel.example' });
  const rejected = await request('/api/action', { origin: 'https://attacker.example' });

  assert.equal(accepted.status, 204);
  assert.equal(rejected.status, 403);
});

test('allows mutations from the explicit Capacitor iOS origin', async () => {
  const response = await request('/api/action', { origin: 'capacitor://localhost' });

  assert.equal(response.status, 204);
});

test('allows credentialed CORS only for the configured site and native app origins', async () => {
  const app = express();
  app.use(createClientCors('https://bavel.example'));
  app.options('/api/action', (_req, res) => res.sendStatus(204));
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/action`;

  const web = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://bavel.example',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization,content-type'
    }
  });
  const native = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      origin: 'capacitor://localhost',
      'access-control-request-method': 'POST'
    }
  });
  const untrusted = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://attacker.example',
      'access-control-request-method': 'POST'
    }
  });

  assert.equal(web.headers.get('access-control-allow-origin'), 'https://bavel.example');
  assert.equal(web.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(native.headers.get('access-control-allow-origin'), 'capacitor://localhost');
  assert.equal(untrusted.headers.get('access-control-allow-origin'), null);
});

test('rejects malformed origins and cookie-authenticated mutations without an origin', async () => {
  const malformed = await request('/api/action', { origin: 'https://bavel.example/path' });
  const cookieRequest = await request('/api/action', { cookie: 'session_token=legacy' });

  assert.equal(malformed.status, 403);
  assert.equal(cookieRequest.status, 403);
});

test('permits origin-less native bearer requests but blocks cross-site fetches', async () => {
  const nativeRequest = await request('/api/action', { authorization: 'Bearer opaque' });
  const crossSite = await request('/api/action', { 'sec-fetch-site': 'cross-site' });

  assert.equal(nativeRequest.status, 204);
  assert.equal(crossSite.status, 403);
});

test('allows safe methods and signed payment webhooks', async () => {
  const safeRequest = await request('/api/action', {}, 'GET');
  const webhook = await request('/api/payments/webhook/stripe', { 'sec-fetch-site': 'cross-site' });

  assert.equal(safeRequest.status, 204);
  assert.equal(webhook.status, 204);
});
