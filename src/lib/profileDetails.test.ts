import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeProfileDetails } from './profileDetails.js';

describe('profile details persistence', () => {
  it('preserves supported keyed details while dropping internal fields', () => {
    assert.deepEqual(
      normalizeProfileDetails({
        relation: 'Relation sérieuse',
        prompts: [
          { question: 'Mon week-end idéal ?', answer: 'Une randonnée.' },
          { question: 'Ignore', answer: 42 }
        ],
        moderation_notes: 'internal',
        email: 'private@example.com'
      }),
      {
        relation: 'Relation sérieuse',
        prompts: [{ question: 'Mon week-end idéal ?', answer: 'Une randonnée.' }]
      }
    );
  });

  it('preserves legacy string arrays during schema conversion', () => {
    assert.deepEqual(normalizeProfileDetails(['Voyage', 42, 'Musique']), ['Voyage', 'Musique']);
  });
});
