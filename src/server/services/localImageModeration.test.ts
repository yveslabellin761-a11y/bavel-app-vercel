import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import {
  createBlurredPrivateImagePreview,
  evaluateImagePredictions,
  ImageModerationError,
  moderateImageLocally,
  normalizeImageForPrivateStorage,
} from './localImageModeration';

describe('Bavel local image moderation', () => {
  it('blocks explicit images more strictly for profile photos than for chat', () => {
    const predictions = [
      { className: 'Porn', probability: 0.4 },
      { className: 'Neutral', probability: 0.55 },
      { className: 'Sexy', probability: 0.05 },
      { className: 'Hentai', probability: 0 },
      { className: 'Drawing', probability: 0 },
    ] as const;

    const profileResult = evaluateImagePredictions([...predictions], 'profile');
    const chatResult = evaluateImagePredictions([...predictions], 'chat');

    assert.equal(profileResult.isSafe, false);
    assert.equal(profileResult.blurRequired, false);
    assert.equal(chatResult.isSafe, true);
    assert.equal(chatResult.blurRequired, true);
  });

  it('flags suggestive chat images for blur without treating them as explicit', () => {
    const result = evaluateImagePredictions(
      [
        { className: 'Porn', probability: 0.02 },
        { className: 'Neutral', probability: 0.15 },
        { className: 'Sexy', probability: 0.7 },
        { className: 'Hentai', probability: 0.01 },
        { className: 'Drawing', probability: 0.12 },
      ],
      'chat'
    );

    assert.equal(result.isSafe, true);
    assert.equal(result.blurRequired, true);
    assert.deepEqual(result.categories, ['Sexy']);
  });

  it('rejects malformed image input before model inference', async () => {
    await assert.rejects(
      moderateImageLocally('not-an-image', 'profile'),
      (error: unknown) => error instanceof ImageModerationError && error.status === 415
    );
  });

  it('rejects oversized image data before decoding or model inference', async () => {
    const oversizedImage = `data:image/png;base64,${'A'.repeat(14 * 1024 * 1024)}`;
    await assert.rejects(
      moderateImageLocally(oversizedImage, 'profile'),
      (error: unknown) => error instanceof ImageModerationError && error.status === 413
    );
  });

  it('normalizes accepted image input to bounded WebP for private storage', async () => {
    const png = await sharp({
      create: { width: 32, height: 24, channels: 3, background: '#e8e8e8' },
    }).png().toBuffer();
    const normalized = await normalizeImageForPrivateStorage(
      `data:image/png;base64,${png.toString('base64')}`
    );
    const metadata = await sharp(normalized).metadata();

    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 32);
    assert.equal(metadata.height, 24);
  });

  it('creates a separate blurred WebP preview instead of exposing the original pixels', async () => {
    const original = await sharp({
      create: { width: 64, height: 48, channels: 3, background: '#e80000' },
    }).png().toBuffer();
    const preview = await createBlurredPrivateImagePreview(original);
    const metadata = await sharp(preview).metadata();

    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 64);
    assert.equal(metadata.height, 48);
    assert.notDeepEqual(preview, original);
  });

  it('loads the pinned model and performs CPU inference with locally hosted weights', async () => {
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#e8e8e8' },
    }).png().toBuffer();
    const result = await moderateImageLocally(`data:image/png;base64,${png.toString('base64')}`, 'profile');

    assert.equal(result.model, 'nsfwjs-mobilenet-v2');
    assert.equal(result.processedLocally, true);
    assert.equal(result.scores.Neutral !== undefined, true);
    assert.equal(result.isSafe, true);
  });
});
