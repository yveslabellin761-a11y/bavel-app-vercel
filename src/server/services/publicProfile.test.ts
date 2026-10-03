import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toPublicProfile } from './publicProfile.js';

describe('public profile serialization', () => {
  it('exposes only public profile fields and never precise coordinates or account metadata', () => {
    const result = toPublicProfile({
      id: 'profile-id',
      email: 'private@example.com',
      latitude: 5.3,
      longitude: -4.1,
      role: 'admin',
      tier: 'vip',
      is_suspended: false,
      name: 'Sam',
      photos: ['photo.webp'],
      distanceKm: 2.4
    });

    assert.equal(result.id, 'profile-id');
    assert.equal(result.img, 'photo.webp');
    assert.equal(result.distanceKm, 0);
    assert.equal('email' in result, false);
    assert.equal('latitude' in result, false);
    assert.equal('longitude' in result, false);
    assert.equal('role' in result, false);
    assert.equal('tier' in result, false);
    assert.equal('is_suspended' in result, false);
  });

  it('respects status and distance privacy settings', () => {
    const result = toPublicProfile({
      id: 'profile-id',
      city: 'Abidjan',
      country: 'Côte d’Ivoire',
      is_online: true,
      last_active_at: '2025-01-01T00:00:00Z',
      distanceKm: 12
    }, {
      showOnlineStatus: false,
      showDistance: false
    });

    assert.equal('online' in result, false);
    assert.equal('is_online' in result, false);
    assert.equal('last_active_at' in result, false);
    assert.equal('distanceKm' in result, false);
    assert.equal('distanceText' in result, false);
    assert.equal(result.city, '');
    assert.equal(result.location, '');
    assert.equal(result.country, 'Côte d’Ivoire');
  });

  it('does not expose stale or future presence as online', () => {
    const staleResult = toPublicProfile({
      id: 'stale-profile',
      is_online: true,
      last_active_at: new Date(Date.now() - 120_000).toISOString()
    });
    const futureResult = toPublicProfile({
      id: 'future-profile',
      is_online: true,
      last_active_at: new Date(Date.now() + 60_000).toISOString()
    });

    assert.equal(staleResult.online, false);
    assert.equal(staleResult.is_online, false);
    assert.equal(futureResult.online, false);
    assert.equal(futureResult.is_online, false);
  });

  it('filters private and operational values from the profile details JSON', () => {
    const result = toPublicProfile({
      id: 'profile-id',
      details: {
        relation: 'Relation sérieuse',
        religion: 'Sans préférence',
        boost_expires_at: 1790000000000,
        boost_multiplier: 5,
        moderation_notes: 'internal',
        prompts: [
          { question: 'Mon week-end idéal ?', answer: 'Une randonnée.' },
          { question: 'private', answer: 123 }
        ]
      }
    });

    assert.deepEqual(result.details, {
      relation: 'Relation sérieuse',
      religion: 'Sans préférence',
      prompts: [{ question: 'Mon week-end idéal ?', answer: 'Une randonnée.' }]
    });
  });
});
