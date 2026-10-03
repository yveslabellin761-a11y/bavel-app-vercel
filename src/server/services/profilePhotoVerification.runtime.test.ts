import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyProfilePhotos } from './profilePhotoVerification';

test('runs face, liveness, anti-spoof and descriptor inference with packaged local models', async () => {
  const userId = '098f6bcd-4621-3373-8ade-4e832627b4f6';
  const jpeg = await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .jpeg()
    .toBuffer();
  const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { photos: [`${userId}/profile.jpg`], avatar_url: null },
            error: null
          })
        })
      })
    }),
    storage: {
      from: () => ({
        download: async () => ({
          data: new Blob([new Uint8Array(jpeg)]),
          error: null
        })
      })
    }
  } as unknown as SupabaseClient;

  const result = await verifyProfilePhotos(
    db,
    userId,
    'blink',
    Array.from({ length: 5 }, () => dataUrl)
  );
  assert.deepEqual(result, { approved: false, reason: 'face_not_found' });
});
