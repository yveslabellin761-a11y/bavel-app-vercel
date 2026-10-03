import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getProfilePhotoStoragePath,
  toStoredProfilePhotoReference
} from './profilePhotoUrls.js';

describe('private profile photo references', () => {
  it('extracts paths from legacy public and signed Supabase URLs', () => {
    assert.equal(
      getProfilePhotoStoragePath('https://example.supabase.co/storage/v1/object/public/profile-photos/user-id/photo.webp'),
      'user-id/photo.webp'
    );
    assert.equal(
      getProfilePhotoStoragePath('https://example.supabase.co/storage/v1/object/sign/profile-photos/user-id/photo%20one.webp?token=secret'),
      'user-id/photo one.webp'
    );
  });

  it('keeps raw object paths and does not treat external media URLs as private storage objects', () => {
    assert.equal(getProfilePhotoStoragePath('user-id/photo.webp'), 'user-id/photo.webp');
    assert.equal(getProfilePhotoStoragePath('https://images.example/photo.webp'), null);
    assert.equal(getProfilePhotoStoragePath('data:image/webp;base64,AAAA'), null);
    assert.equal(getProfilePhotoStoragePath(''), null);
  });

  it('normalizes signed URLs to storage paths for persistence', () => {
    assert.equal(
      toStoredProfilePhotoReference('https://example.supabase.co/storage/v1/object/sign/profile-photos/user-id/photo.webp?token=secret'),
      'user-id/photo.webp'
    );
  });
});
