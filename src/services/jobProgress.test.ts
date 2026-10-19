import assert from 'node:assert/strict';
import test from 'node:test';
import { PmItem } from '../types';
import { applyJobProgress } from './jobProgress';

const createJob = (locations: string[], targetUserUids: string[]): PmItem => ({
  id: 'pm-test',
  code: 'PM-TEST',
  title: 'Test PM',
  dates: '',
  startDate: '',
  endDate: '',
  pic: '',
  picRole: '',
  progress: 0,
  doneCount: 0,
  totalCount: 10,
  pendingCount: 10,
  regions: locations.join(', '),
  regionsDetail: [],
  recentLog: { name: '', avatar: '', activity: '', time: '' },
  targetWilayahList: locations,
  targetUserUids,
});

test('completion is counted once per location even when multiple users are assigned there', () => {
  const [job] = applyJobProgress(
    [createJob(['Medan'], ['user-1', 'user-2'])],
    [],
    [{ jobId: 'pm-test', submittedBy: 'user-1', region: 'Medan', pointsCount: 5 }]
  );

  assert.equal(job.progress, 100);
  assert.equal(job.doneCount, 10);
  assert.equal(job.totalCount, 10);
});

test('a submitted report completes its location even when the cached recipient list is stale', () => {
  const [job] = applyJobProgress(
    [createJob(['Medan'], ['another-user'])],
    [{ jobId: 'pm-test', userUid: 'user-1', location: 'Medan', doneCount: 5, totalCount: 10 }],
    [{ jobId: 'pm-test', submittedBy: 'user-1', region: 'Medan', pointsCount: 5 }]
  );

  assert.equal(job.progress, 100);
  assert.equal(job.doneCount, 10);
  assert.equal(job.totalCount, 10);
});

test('completion remains location-weighted when a PM targets multiple locations', () => {
  const [job] = applyJobProgress(
    [createJob(['Medan', 'Jakarta'], ['user-1', 'user-2'])],
    [],
    [{ jobId: 'pm-test', submittedBy: 'user-1', region: 'Medan', pointsCount: 5 }]
  );

  assert.equal(job.progress, 50);
  assert.equal(job.doneCount, 10);
  assert.equal(job.totalCount, 20);
});
