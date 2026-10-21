import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTargetAreaDetails,
  hasCompletePortalLocationHierarchy,
  getPortalLocationHierarchy,
  jobTargetsAccountLocation,
  parseLegacyAreaDetails,
} from './workflowStore';

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

test('location hierarchy includes flat locations and legacy region hierarchies', () => {
  assert.deepEqual(
    getPortalLocationHierarchy({
      masterGroups: [{
        id: 'sumatera',
        name: 'Wilayah Sumatera',
        locations: ['Medan'],
        locationHierarchy: {
          Medan: [{ id: 'hub', name: 'Hub', places: ['Gedung A'] }],
        },
      }],
      locationHierarchy: {
        Jakarta: [{ id: 'server-room', name: 'Ruang Server', places: ['Lantai 2'] }],
      },
    }),
    {
      Jakarta: [{ id: 'server-room', name: 'Ruang Server', places: ['Lantai 2'] }],
      Medan: [{ id: 'hub', name: 'Hub', places: ['Gedung A'] }],
    }
  );
});

test('targeting a location includes all its users, while a sub-location target is restricted', () => {
  const locationOnlyJob = {
    targetWilayahList: ['Medan'],
    targetAreaDetails: [{
      location: 'Medan',
      subLocations: [{ name: 'Hub', places: [] }],
    }],
    targetSubLocationsByLocation: { Medan: [] },
  };
  const subLocationJob = {
    ...locationOnlyJob,
    targetSubLocationsByLocation: { Medan: ['Hub'] },
  };

  assert.equal(jobTargetsAccountLocation(locationOnlyJob, 'Medan'), true);
  assert.equal(jobTargetsAccountLocation(subLocationJob, 'Medan'), false);
  assert.equal(jobTargetsAccountLocation(subLocationJob, 'Medan', 'Hub'), true);
  assert.equal(jobTargetsAccountLocation(subLocationJob, 'Medan', 'Gudang'), false);
  assert.equal(jobTargetsAccountLocation(subLocationJob, 'Jakarta', 'Hub'), false);
  assert.equal(jobTargetsAccountLocation({
    targetWilayahList: ['Medan'],
    targetAreaDetails: [{ location: 'Medan', subLocations: [{ name: 'Hub', places: [] }] }],
  }, 'Medan'), true);
});

test('target area details use the flat hierarchy when no region group contains the location', () => {
  assert.deepEqual(
    buildTargetAreaDetails(
      ['Jakarta'],
      [],
      { Jakarta: [{ id: 'server-room', name: 'Ruang Server', places: ['Lantai 2'] }] }
    ),
    [{
      location: 'Jakarta',
      subLocations: [{ name: 'Ruang Server', places: ['Lantai 2'] }],
    }]
  );
});

test('portal readiness requires a sub-location for every configured location when selection is mandatory', () => {
  const config = {
    masterWilayah: ['Medan', 'Jakarta'],
    masterGroups: [],
    requireUserSubLocation: true,
    locationHierarchy: {
      Medan: [{ id: 'hub', name: 'Hub', places: [] }],
    },
  };
  assert.equal(hasCompletePortalLocationHierarchy(config), false);
  assert.equal(hasCompletePortalLocationHierarchy({
    ...config,
    locationHierarchy: {
      Medan: [{ id: 'hub', name: 'Hub', places: [] }],
      Jakarta: [{ id: 'server-room', name: 'Ruang Server', places: [] }],
    },
  }), true);
});