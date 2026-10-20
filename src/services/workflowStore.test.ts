import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTargetAreaDetails, parseLegacyAreaDetails } from './workflowStore';

test('legacy area parser returns an empty list for missing data', () => {
  assert.deepEqual(parseLegacyAreaDetails(), []);
  assert.deepEqual(parseLegacyAreaDetails('  '), []);
});

test('legacy area parser groups places under their location and sub-location', () => {
  assert.deepEqual(
    parseLegacyAreaDetails('Medan / Hub / Rack A, Medan / Hub / Rack B, Jakarta / Cabang'),
    [
      {
        location: 'Medan',
        subLocations: [{ name: 'Hub', places: ['Rack A', 'Rack B'] }],
      },
      {
        location: 'Jakarta',
        subLocations: [{ name: 'Cabang', places: [] }],
      },
    ]
  );
});

test('legacy area parser keeps a location without hierarchy', () => {
  assert.deepEqual(parseLegacyAreaDetails('Surabaya'), [
    { location: 'Surabaya', subLocations: [] },
  ]);
});

test('target area details include configured sub-locations and places for selected groups', () => {
  assert.deepEqual(
    buildTargetAreaDetails(
      ['Wilayah Sumatera'],
      [{
        id: 'sumatera',
        name: 'Wilayah Sumatera',
        locations: ['Medan'],
        locationHierarchy: {
          Medan: [{ id: 'hub', name: 'Hub', places: ['Gedung A', 'Gedung B'] }],
        },
      }]
    ),
    [{
      location: 'Medan',
      subLocations: [{ name: 'Hub', places: ['Gedung A', 'Gedung B'] }],
    }]
  );
});