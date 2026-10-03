import assert from 'node:assert/strict';
import test from 'node:test';

const { default: handler } = await import('../api/[...path].js');

test('unavailable API routes return a non-cacheable JSON 503 instead of the SPA HTML', () => {
  const headers = {};
  let body = '';
  const response = {
    statusCode: 200,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end(value) {
      body = value;
    }
  };

  handler({ method: 'GET', url: '/api/health' }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(headers['cache-control'], 'no-store');
  assert.equal(headers['content-type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(body), {
    error: 'api_unavailable',
    message: "L'API Bavel n'est pas encore déployée. Réessayez lorsque le service backend sera disponible."
  });
});
