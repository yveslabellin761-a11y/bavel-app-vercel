import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePostGisRadiusQuery } from './geoService';

test('generates a PostGIS radius query against the activities geography column', () => {
  const query = generatePostGisRadiusQuery(48.8566, 2.3522, 12.5, 25);

  assert.match(query, /FROM public\.activities AS activity/);
  assert.match(query, /activity\.location IS NOT NULL/);
  assert.match(query, /extensions\.ST_DWithin/);
  assert.match(query, /extensions\.ST_Distance/);
  assert.match(query, /extensions\.ST_MakePoint\(2\.3522, 48\.8566\)/);
  assert.match(query, /12500\s*\)\s*ORDER BY distance_km ASC\s*LIMIT 25/i);
  assert.doesNotMatch(query, /location_geom|FROM profiles/i);
});

test('rejects invalid coordinates, radii and limits before creating SQL', () => {
  const invalidInputs: Array<[number, number, number, number]> = [
    [Number.NaN, 0, 10, 50],
    [91, 0, 10, 50],
    [0, Number.POSITIVE_INFINITY, 10, 50],
    [0, 181, 10, 50],
    [0, 0, 0, 50],
    [0, 0, 501, 50],
    [0, 0, 10, 0],
    [0, 0, 10, 1.5],
    [0, 0, 10, 201]
  ];

  for (const inputs of invalidInputs) {
    assert.throws(() => generatePostGisRadiusQuery(...inputs), RangeError);
  }
});
