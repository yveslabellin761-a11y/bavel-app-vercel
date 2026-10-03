import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { after, before, describe, it } from 'node:test';
import sharp from 'sharp';
import {
  createLocalImageModerationMiddleware,
} from './localImageModeration';
import {
  ImageModerationError,
  moderateImageLocally,
  type ImageModerationMode,
  type LocalImageModerationResult,
} from '../services/localImageModeration';

const authHeader = 'Bearer test-session';
let baseUrl = '';
let server: ReturnType<ReturnType<typeof express>['listen']>;

async function requestModeration(
  path: string,
  imageBase64?: string,
  authorization = authHeader
) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/json',
    },
    body: JSON.stringify(imageBase64 === undefined ? {} : { imageBase64 }),
  });
}

async function createTestServer(
  moderateImage: (
    image: unknown,
    mode: ImageModerationMode
  ) => Promise<LocalImageModerationResult> = moderateImageLocally
) {
  const app = express();
  app.use(express.json({ limit: '14mb' }));
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status)
      : 500;
    if (status === 413) return res.status(413).json({ error: 'La requête dépasse la taille maximale autorisée.' });
    return next(error);
  });
  app.use(
    ['/api/ai/private-detector', '/api/check-nsfw', '/api/moderation/photo'],
    (req, res, next) => {
      if (req.headers.authorization !== authHeader) {
        return res.status(401).json({ error: 'Session utilisateur requise.' });
      }
      next();
    }
  );
  app.use(createLocalImageModerationMiddleware(moderateImage));
  server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function closeTestServer() {
  if (!server?.listening) return;
  const closed = once(server, 'close');
  server.close();
  await closed;
}

describe('local image moderation HTTP middleware', () => {
  before(async () => createTestServer());
  after(closeTestServer);

  it('requires a session before running image moderation', async () => {
    const response = await requestModeration('/api/check-nsfw', undefined, '');
    assert.equal(response.status, 401);
  });

  it('rejects oversized HTTP payloads before calling inference', async () => {
    let inferenceCalls = 0;
    await closeTestServer();
    await createTestServer(async () => {
      inferenceCalls += 1;
      throw new Error('must not infer oversized payload');
    });

    const response = await requestModeration(
      '/api/check-nsfw',
      `data:image/png;base64,${'A'.repeat(15 * 1024 * 1024)}`
    );
    assert.equal(response.status, 413);
    assert.match((await response.json()).error, /taille maximale/);
    assert.equal(inferenceCalls, 0);
  });

  it('runs the local model through the authenticated profile-photo endpoint', async () => {
    await closeTestServer();
    await createTestServer();
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#e8e8e8' },
    }).png().toBuffer();
    const response = await requestModeration(
      '/api/check-nsfw',
      `data:image/png;base64,${png.toString('base64')}`
    );
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.model, 'nsfwjs-mobilenet-v2');
    assert.equal(result.processedLocally, true);
    assert.equal(typeof result.isSafe, 'boolean');
  });

  it('selects chat mode for the private detector and profile mode for profile routes', async () => {
    const modes: ImageModerationMode[] = [];
    const result = {
      isSafe: true,
      blurRequired: false,
      isPrivateContent: false,
      categories: [],
      scores: {},
      model: 'nsfwjs-mobilenet-v2',
      processedLocally: true,
      message: 'Aucun contenu explicite détecté.',
    } satisfies LocalImageModerationResult;
    await closeTestServer();
    await createTestServer(async (_image, mode) => {
      modes.push(mode);
      return result;
    });

    for (const [path, expectedMode] of [
      ['/api/ai/private-detector', 'chat'],
      ['/api/check-nsfw', 'profile'],
      ['/api/moderation/photo', 'profile'],
    ] as const) {
      const response = await requestModeration(path, 'test');
      assert.equal(response.status, 200);
      assert.equal(modes.at(-1), expectedMode);
    }
  });

  it('preserves client errors and reports local model unavailability as 503', async () => {
    await closeTestServer();
    await createTestServer();
    const malformedResponse = await requestModeration('/api/check-nsfw', 'not-an-image');
    assert.equal(malformedResponse.status, 415);

    await closeTestServer();
    await createTestServer(async (_image, _mode) => {
      throw new ImageModerationError('Échec de test.', 503);
    });

    const response = await requestModeration('/api/ai/private-detector', 'test');
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.capability, 'server-local-image-moderation');
    assert.equal(body.externalProvider, false);
  });
});
