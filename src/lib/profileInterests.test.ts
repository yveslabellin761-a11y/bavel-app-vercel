import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeProfileInterests } from './profileInterests.js';

describe('profile interest persistence', () => {
  it('stores labels from editor choices in the profiles text-array format', () => {
    assert.deepEqual(
      normalizeProfileInterests([
        { icon: '🎨', label: 'Art' },
        'Voyage',
        { icon: '🎵', label: 'Musique' },
        { label: 42 },
        null
      ]),
      ['Art', 'Voyage', 'Musique']
    );
  });

  it('limits persisted interests to the editor maximum', () => {
    assert.equal(normalizeProfileInterests(Array.from({ length: 10 }, (_, index) => `Interest ${index}`)).length, 8);
  });
});
