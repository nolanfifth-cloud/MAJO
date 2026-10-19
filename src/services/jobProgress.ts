import { PmItem } from '../types';

export const applyJobProgress = (
  jobs: PmItem[],
  snapshots: Record<string, unknown>[],
  completedReports: Record<string, unknown>[] = []
): PmItem[] => {
  const progressByJob = new Map<string, Record<string, unknown>[]>();
  snapshots.forEach((snapshot) => {
    const jobId = String(snapshot.jobId || '');
    if (!jobId) return;
    progressByJob.set(jobId, [...(progressByJob.get(jobId) || []), snapshot]);
  });
  return jobs.map((job) => {
    const recipients = new Set(job.targetUserUids || []);
    const jobSnapshotsByUser = new Map((progressByJob.get(job.id) || []).filter((snapshot) =>
      recipients.size === 0 || recipients.has(String(snapshot.userUid || ''))
    ).map((snapshot) => [String(snapshot.userUid || ''), snapshot]));
    completedReports
      .filter((report) => String(report.jobId || '') === job.id)
      .forEach((report) => {
        const userUid = String(report.submittedBy || '');
        if (!userUid) return;
        const pointsCount = Number(report.pointsCount || 0);
        const assignedChecklistCount = Number(job.totalCount || pointsCount);
        const previous = jobSnapshotsByUser.get(userUid) || {};
        jobSnapshotsByUser.set(userUid, {
          ...previous,
          userUid,
          location: String(report.region || previous.location || ''),
          updatedAt: String(report.savedAt || report.completedAt || previous.updatedAt || ''),
          submitted: true,
          doneCount: Math.max(Number(previous.doneCount || 0), assignedChecklistCount),
          totalCount: Math.max(Number(previous.totalCount || 0), assignedChecklistCount),
        });
      });
    const jobSnapshots = [...jobSnapshotsByUser.values()];
    const locations = [...new Set((job.targetWilayahList || [])
      .map((location) => location.trim())
      .filter(Boolean))];
    const snapshotsByLocation = new Map<string, Record<string, unknown>[]>();
    jobSnapshots.forEach((snapshot) => {
      const snapshotLocation = String(snapshot.location || '');
      const location = snapshotLocation || (locations.length === 1 ? locations[0] : '');
      if (!location) return;
      const key = location.toLowerCase();
      snapshotsByLocation.set(key, [...(snapshotsByLocation.get(key) || []), snapshot]);
    });
    const progressLocations = locations.length > 0
      ? locations
      : [...new Map(jobSnapshots
        .map((snapshot) => String(snapshot.location || ''))
        .filter(Boolean)
        .map((location) => [location.toLowerCase(), location])).values()];
    const doneCount = progressLocations.reduce((total, location) => {
      const locationSnapshots = snapshotsByLocation.get(location.toLowerCase()) || [];
      const completedSnapshot = locationSnapshots.find((snapshot) => snapshot.submitted === true);
      if (completedSnapshot) return total + Number(job.totalCount || completedSnapshot.totalCount || 0);
      return total + Math.min(
        Number(job.totalCount || Number.MAX_SAFE_INTEGER),
        locationSnapshots.reduce(
          (maximum, snapshot) => Math.max(maximum, Number(snapshot.doneCount || 0)),
          0
        )
      );
    }, 0);
    const expectedTotal = job.totalCount * Math.max(progressLocations.length, 1);
    const totalCount = Math.max(
      expectedTotal,
      progressLocations.reduce((total, location) => {
        const locationSnapshots = snapshotsByLocation.get(location.toLowerCase()) || [];
        return total + Math.max(
          Number(job.totalCount || 0),
          ...locationSnapshots.map((snapshot) => Number(snapshot.totalCount || 0))
        );
      }, 0)
    );
    const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
    return {
      ...job,
      progress,
      doneCount,
      totalCount,
      pendingCount: Math.max(0, totalCount - doneCount),
      fieldProgress: jobSnapshots.map((snapshot) => ({
        userUid: String(snapshot.userUid || ''),
        technicianName: String(snapshot.technicianName || ''),
        location: String(snapshot.location || ''),
        updatedAt: String(snapshot.updatedAt || ''),
        devices: Array.isArray(snapshot.devices) ? snapshot.devices as Record<string, unknown>[] : [],
      })),
    };
  });
};
