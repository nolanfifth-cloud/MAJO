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

test('submitted report details expose selected places in admin field progress', () => {
  const [job] = applyJobProgress(
    [createJob(['Medan'], ['user-1'])],
    [],
    [{
      jobId: 'pm-test',
      submittedBy: 'user-1',
      region: 'Medan',
      pointsCount: 1,
      subJobs: [{
        id: 'device-1',
        subtaskId: 'pm-test_subtask_1',
        taskId: 'task-1',
        pointId: 'point-1',
        name: 'Periksa UPS',
        device: 'Medan / Hub / Gedung A',
        subLocation: 'Hub',
        place: 'Gedung A',
        photos: [{
          name: 'ups.jpg',
          photoUrl: 'https://images.example/ups.jpg',
          caption: 'Label UPS terlihat jelas',
        }],
      }],
    }]
  );

  assert.equal(job.fieldProgress?.[0].devices?.[0].place, 'Gedung A');
  assert.equal(job.fieldProgress?.[0].devices?.[0].subLocation, 'Hub');
  const formData = job.fieldProgress?.[0].devices?.[0].formData as Record<string, unknown>;
  const photos = formData.photos as Record<string, unknown>[];
  assert.equal(photos[0].caption, 'Label UPS terlihat jelas');
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
