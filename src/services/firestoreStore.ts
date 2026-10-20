import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { PmItem, RegisteredAccount, RegionConfig } from '../types';
import { firebaseAuth, firebaseProjectId, firestore, isFirebaseConfigured } from './firebase';
import {
  buildTargetAreaDetails,
  PortalMasterConfig,
  getActivePortalAddress,
  normalizePortalAddress,
} from './workflowStore';

const portalDocId = (portalAddress?: string): string => {
  const target = normalizePortalAddress(portalAddress || getActivePortalAddress() || 'portal');
  return target || 'portal';
};

const portalDoc = (portalAddress?: string) => {
  if (!firestore) throw new Error('Firebase belum dikonfigurasi.');
  return doc(firestore, 'appConfig', portalDocId(portalAddress));
};

function omitUndefinedFields(value: Record<string, unknown>): Record<string, unknown> {
  const cleanValue = (fieldValue: unknown): unknown => {
    if (Array.isArray(fieldValue)) {
      return fieldValue.map((item) => item === undefined ? null : cleanValue(item));
    }
    if (fieldValue && typeof fieldValue === 'object') {
      const prototype = Object.getPrototypeOf(fieldValue);
      if (prototype !== Object.prototype && prototype !== null) return fieldValue;
      return Object.fromEntries(
        Object.entries(fieldValue)
          .filter(([, nestedValue]) => nestedValue !== undefined)
          .map(([key, nestedValue]) => [key, cleanValue(nestedValue)])
      );
    }
    return fieldValue;
  };

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => fieldValue !== undefined)
      .map(([key, fieldValue]) => [key, cleanValue(fieldValue)])
  );
}

export async function loadPortalConfigFromFirestore(portalAddress?: string): Promise<PortalMasterConfig | null> {
  if (!isFirebaseConfigured || !firestore) return null;
  const snapshot = await getDoc(portalDoc(portalAddress));
  return snapshot.exists() ? (snapshot.data() as PortalMasterConfig) : null;
}

export async function savePortalConfigToFirestore(config: PortalMasterConfig): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;
  const address = normalizePortalAddress(config.portalAddress || getActivePortalAddress() || 'portal');
  await setDoc(portalDoc(address), {
    ...config,
    portalAddress: address,
    portalLink: normalizePortalAddress(config.portalLink || config.portalAddress || address) || address,
  }, { merge: true });
}

export async function loadAdminJobsFromFirestore(): Promise<PmItem[]> {
  return loadJobsForPortalFromFirestore(getActivePortalAddress());
}

export async function loadJobsForPortalFromFirestore(portalId: string): Promise<PmItem[]> {
  if (!isFirebaseConfigured || !firestore || !portalId) return [];
  const normalizedPortalId = normalizePortalAddress(portalId);
  const snapshot = await getDocs(
    query(collection(firestore, 'jobs'), where('portalId', '==', normalizedPortalId))
  );
  return snapshot.docs.map((item) => ({
    ...(item.data() as PmItem),
    id: item.id,
    portalId: normalizedPortalId,
  }));
}

export async function loadJobsForUserFromFirestore(): Promise<PmItem[]> {
  const database = firestore;
  if (!isFirebaseConfigured || !database) return [];
  const authenticatedUid = firebaseAuth?.currentUser?.uid;
  if (!authenticatedUid) throw new Error('Sesi Firebase tidak aktif. Silakan login ulang sebagai user.');
  let profileSnapshot;
  try {
    profileSnapshot = await getDoc(doc(database, 'users', authenticatedUid));
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'unknown';
    const message = error instanceof Error ? error.message : 'Kesalahan Firebase tidak diketahui.';
    throw new Error(`Gagal membaca profil user di proyek "${firebaseProjectId}" (${code}): ${message}`);
  }
  const profile = profileSnapshot.data();
  const portalId = normalizePortalAddress(String(profile?.portalAddress || ''));
  const location = String(profile?.location || '');
  if (!profileSnapshot.exists()) {
    throw new Error(`Profil user tidak ditemukan di proyek "${firebaseProjectId}".`);
  }
  if (profile?.role !== 'user') {
    throw new Error(`Profil akun di proyek "${firebaseProjectId}" tidak memiliki role user yang valid.`);
  }
  if (!portalId || !location) {
    throw new Error(`Profil user di proyek "${firebaseProjectId}" belum memiliki ${[
      !portalId ? 'portalAddress' : '',
      !location ? 'location' : '',
    ].filter(Boolean).join(' dan ')}.`);
  }
  const portalConfig = await loadPortalConfigFromFirestore(portalId);

  let assignmentsSnapshot;
  try {
    assignmentsSnapshot = await getDocs(
      collection(database, 'users', authenticatedUid, 'jobAssignments')
    );
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'unknown';
    const message = error instanceof Error ? error.message : 'Kesalahan Firestore tidak diketahui.';
    throw new Error(`Gagal membaca daftar penugasan user di proyek "${firebaseProjectId}" (${code}): ${message}`);
  }

  const assignedJobIds = assignmentsSnapshot.docs
    .filter((assignment) => {
      const data = assignment.data();
      return data.userUid === authenticatedUid
        && normalizePortalAddress(String(data.portalId || '')) === portalId
        && data.location === location;
    })
    .map((assignment) => assignment.id);
  const jobs: (PmItem | null)[] = await Promise.all(assignedJobIds.map(async (jobId) => {
    const assignmentRef = doc(database, 'users', authenticatedUid, 'jobAssignments', jobId);
    try {
      const jobSnapshot = await getDoc(doc(database, 'jobs', jobId));
      if (!jobSnapshot.exists()) {
        await deleteDoc(assignmentRef);
        return null;
      }
      const job = jobSnapshot.data() as PmItem;
      if (
        normalizePortalAddress(String(job.portalId || '')) !== portalId
        || !job.targetWilayahList?.includes(location)
      ) {
        throw new Error('portal atau lokasi pada PM tidak lagi cocok dengan penugasannya');
      }
      return {
        ...job,
        id: jobSnapshot.id,
        portalId,
        targetAreaDetails: job.targetAreaDetails?.length
          ? job.targetAreaDetails
          : buildTargetAreaDetails(job.targetWilayahList || [], portalConfig?.masterGroups || []),
      };
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : 'invalid-assignment';
      const message = error instanceof Error ? error.message : 'Kesalahan Firestore tidak diketahui.';
      if (code === 'permission-denied') {
        try {
          await deleteDoc(assignmentRef);
          return null;
        } catch (cleanupError) {
          const cleanupMessage = cleanupError instanceof Error
            ? cleanupError.message
            : 'Kesalahan Firestore tidak diketahui.';
          throw new Error(
            `Gagal membaca PM "${jobId}" di proyek "${firebaseProjectId}" (${code}): ${message} ` +
            `Pembersihan assignment lama juga gagal: ${cleanupMessage}`
          );
        }
      }
      throw new Error(`Gagal membaca PM "${jobId}" di proyek "${firebaseProjectId}" (${code}): ${message}`);
    }
  }));
  return jobs.filter((job): job is PmItem => job !== null);
}

export async function saveJobProgressToFirestore(
  jobId: string,
  userUid: string,
  location: string,
  devices: unknown[],
  portalId: string,
  summary?: { progress: number; doneCount: number; totalCount: number },
  technicianName?: string
): Promise<void> {
  if (!isFirebaseConfigured || !firestore || !portalId) return;
  const hasInlinePhoto = devices.some((device) => {
    if (!device || typeof device !== 'object') return false;
    const photo = (device as { formData?: { photo?: unknown } }).formData?.photo;
    return typeof photo === 'string' && photo.startsWith('data:');
  });
  if (hasInlinePhoto) throw new Error('Foto belum tersimpan ke Cloudinary; unggah ulang sebelum menyimpan progres.');
  const progressId = `${jobId}_${userUid}`;
  const progressData = omitUndefinedFields({
    jobId,
    userUid,
    location,
    portalId: normalizePortalAddress(portalId),
    ...(technicianName ? { technicianName } : {}),
    devices,
    ...(summary || {}),
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(firestore, 'jobProgress', progressId), progressData, { merge: true });
}

export async function loadJobProgressFromFirestore(portalId: string): Promise<Record<string, unknown>[]> {
  if (!isFirebaseConfigured || !firestore || !portalId) return [];
  const snapshot = await getDocs(
    query(collection(firestore, 'jobProgress'), where('portalId', '==', normalizePortalAddress(portalId)))
  );
  return snapshot.docs.map((item) => item.data());
}

export function subscribeToJobProgressFromFirestore(
  portalId: string,
  onProgress: (snapshots: Record<string, unknown>[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured || !firestore || !portalId) return () => undefined;
  const progressQuery = query(
    collection(firestore, 'jobProgress'),
    where('portalId', '==', normalizePortalAddress(portalId))
  );
  return onSnapshot(
    progressQuery,
    (snapshot) => onProgress(snapshot.docs.map((item) => item.data())),
    (error) => onError?.(error)
  );
}

export async function loadJobProgressForUserFromFirestore(userUid: string): Promise<Record<string, unknown>[]> {
  if (!isFirebaseConfigured || !firestore || !userUid) return [];
  if (firebaseAuth?.currentUser?.uid !== userUid) {
    throw new Error('Sesi Firebase tidak cocok dengan akun user yang aktif.');
  }
  const snapshot = await getDocs(
    query(collection(firestore, 'jobProgress'), where('userUid', '==', userUid))
  );
  return snapshot.docs.map((item) => item.data());
}

export async function loadRegisteredAccountsFromFirestore(portalId: string): Promise<RegisteredAccount[]> {
  if (!isFirebaseConfigured || !firestore || !portalId) return [];
  const snapshot = await getDocs(
    query(collection(firestore, 'users'), where('portalAddress', '==', normalizePortalAddress(portalId)))
  );
  return snapshot.docs.map((item) => ({
    uid: item.id,
    ...(item.data() as RegisteredAccount),
  }));
}

export async function loadPasswordResetRequestsFromFirestore(portalId: string): Promise<Record<string, unknown>[]> {
  if (!isFirebaseConfigured || !firestore || !portalId) return [];
  const snapshot = await getDocs(query(
    collection(firestore, 'passwordResetRequests'),
    where('portalAddress', '==', normalizePortalAddress(portalId))
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function subscribeToPasswordResetRequestsFromFirestore(
  portalId: string,
  onRequests: (requests: Record<string, unknown>[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured || !firestore || !portalId) return () => undefined;
  const requestsQuery = query(
    collection(firestore, 'passwordResetRequests'),
    where('portalAddress', '==', normalizePortalAddress(portalId))
  );
  return onSnapshot(
    requestsQuery,
    (snapshot) => onRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => onError?.(error)
  );
}

export async function saveAdminJobToFirestore(
  job: PmItem,
  adminUid: string,
  portalId: string,
  mode: 'create' | 'update' = 'update'
): Promise<string | null> {
  const database = firestore;
  if (!isFirebaseConfigured || !database) return null;
  if (!adminUid || !portalId) throw new Error('Sesi admin atau alamat portal tidak tersedia.');
  const normalizedPortalId = normalizePortalAddress(portalId);
  const targetLocations = new Set(job.targetWilayahList || []);
  const assignedAccounts = await loadRegisteredAccountsFromFirestore(normalizedPortalId);
  const targetUserUids = assignedAccounts
    .filter((account) => account.role === 'user' && account.uid && account.location && targetLocations.has(account.location))
    .map((account) => account.uid as string);
  const jobRef = doc(database, 'jobs', job.id);
  const existingJobSnapshot = mode === 'update' ? await getDoc(jobRef) : null;
  if (mode === 'update' && !existingJobSnapshot?.exists()) {
    throw new Error(`PM "${job.id}" tidak ditemukan untuk diperbarui.`);
  }
  const existingJob = existingJobSnapshot?.exists() ? existingJobSnapshot.data() : null;
  if (existingJob && normalizePortalAddress(String(existingJob.portalId || '')) !== normalizedPortalId) {
    throw new Error('Pekerjaan ini bukan bagian dari portal admin yang sedang aktif.');
  }
  const creatorMetadata = mode === 'create'
    ? { createdBy: adminUid }
    : existingJobSnapshot?.exists()
    ? existingJob && Object.prototype.hasOwnProperty.call(existingJob, 'createdBy')
      ? { createdBy: existingJob.createdBy }
      : {}
    : {};
  await setDoc(jobRef, {
    ...job,
    portalId: normalizedPortalId,
    targetUserUids,
    createdAt: typeof existingJob?.createdAt === 'string'
      ? existingJob.createdAt
      : job.createdAt || new Date().toISOString(),
    ...creatorMetadata,
  });
  const savedJob = {
    ...job,
    portalId: normalizedPortalId,
    createdBy: String(creatorMetadata.createdBy || adminUid),
  };
  await assignExistingAdminJobToUsers(savedJob, adminUid, assignedAccounts);
  return normalizedPortalId;
}

export async function assignExistingAdminJobToUsers(
  job: PmItem,
  adminUid: string,
  accounts: RegisteredAccount[]
): Promise<void> {
  const database = firestore;
  if (!isFirebaseConfigured || !database || !job.id || !adminUid || job.createdBy !== adminUid) return;
  const targetLocations = new Set(job.targetWilayahList || []);
  const targetUserUids = accounts
    .filter((account) => account.role === 'user' && account.uid && account.location && targetLocations.has(account.location))
    .map((account) => account.uid as string);
  await updateDoc(doc(database, 'jobs', job.id), { targetUserUids });

  const recipients = new Map(
    accounts
      .filter((account) =>
        account.role === 'user'
        && account.uid
        && account.location
        && targetLocations.has(account.location)
      )
      .map((account) => [account.uid as string, account])
  );
  await Promise.all([...recipients.entries()].map(async ([userUid, account]) => {
    const assignmentRef = doc(database, 'users', userUid, 'jobAssignments', job.id);
    await setDoc(assignmentRef, {
      jobId: job.id,
      userUid,
      location: account.location,
      portalId: normalizePortalAddress(job.portalId || ''),
      createdBy: adminUid,
    });
  }));
}

export async function deleteAdminJobFromFirestore(job: PmItem, portalId?: string): Promise<void> {
  if (!job.id) throw new Error('ID pekerjaan tidak tersedia.');
  const database = firestore;
  if (!isFirebaseConfigured || !database || !job.portalId) return;

  const adminUid = firebaseAuth?.currentUser?.uid;
  const activePortalId = normalizePortalAddress(portalId || '') || getActivePortalAddress();
  if (!adminUid) throw new Error('Sesi Firebase tidak aktif. Silakan login ulang sebagai admin.');
  if (!activePortalId) throw new Error('Alamat portal admin tidak ditemukan.');
  if (normalizePortalAddress(job.portalId) !== activePortalId) {
    throw new Error('Pekerjaan ini bukan bagian dari portal admin yang sedang aktif.');
  }

  const targetLocations = new Set(job.targetWilayahList || []);
  const accounts = await loadRegisteredAccountsFromFirestore(activePortalId);
  const recipientUids = new Set(job.targetUserUids || []);
  accounts.forEach((account) => {
    if (account.uid && account.location && targetLocations.has(account.location)) {
      recipientUids.add(account.uid);
    }
  });

  const [progressSnapshot, reportsSnapshot] = await Promise.all([
    getDocs(query(
      collection(database, 'jobProgress'),
      where('portalId', '==', activePortalId)
    )),
    getDocs(query(
      collection(database, 'completedReports'),
      where('portalId', '==', activePortalId)
    )),
  ]);
  const jobProgressDocs = progressSnapshot.docs.filter((snapshot) => snapshot.data().jobId === job.id);
  const completedReportDocs = reportsSnapshot.docs.filter((snapshot) => snapshot.data().jobId === job.id);

  await Promise.all([
    ...jobProgressDocs.map((snapshot) => deleteDoc(snapshot.ref)),
    ...completedReportDocs.map((snapshot) => deleteDoc(snapshot.ref)),
  ]);

  await Promise.all([...recipientUids].map(async (userUid) => {
    try {
      await deleteDoc(doc(database, 'users', userUid, 'jobAssignments', job.id));
    } catch {
      // A missing or legacy assignment must not block removal of the job itself.
    }
  }));
  await Promise.all([...(job.targetWilayahList || [])].map(async (location) => {
    try {
      await deleteDoc(doc(database, 'portalJobCatalog', activePortalId, 'locations', location, 'jobs', job.id));
    } catch {
      // A missing or legacy catalog entry must not block removal of the job itself.
    }
  }));
  await deleteDoc(doc(database, 'jobs', job.id));
}

export async function deleteOrphanedJobDataFromFirestore(
  portalId: string,
  activeJobIds: ReadonlySet<string>
): Promise<void> {
  const database = firestore;
  if (!isFirebaseConfigured || !database || !portalId) return;
  const normalizedPortalId = normalizePortalAddress(portalId);
  const [progressSnapshot, reportsSnapshot] = await Promise.all([
    getDocs(query(collection(database, 'jobProgress'), where('portalId', '==', normalizedPortalId))),
    getDocs(query(collection(database, 'completedReports'), where('portalId', '==', normalizedPortalId))),
  ]);
  const orphanedRecords = [...progressSnapshot.docs, ...reportsSnapshot.docs].filter((snapshot) => {
    const jobId = String(snapshot.data().jobId || '');
    return jobId.length > 0 && !activeJobIds.has(jobId);
  });
  await Promise.all(orphanedRecords.map((snapshot) => deleteDoc(snapshot.ref)));
}

export async function saveCompletedReportToFirestore(report: Record<string, unknown>, userUid: string, portalId: string): Promise<void> {
  if (!isFirebaseConfigured || !firestore || !userUid || !portalId) return;
  const reportId = String(report.id || `${Date.now()}`);
  const jobId = String(report.jobId || '');
  const location = String(report.region || '');
  const pointsCount = Number(report.pointsCount || 0);
  if (!jobId || !location || !Number.isFinite(pointsCount) || pointsCount < 1) {
    throw new Error('Data laporan tidak lengkap untuk menandai PM selesai.');
  }
  const normalizedPortalId = normalizePortalAddress(portalId);
  const reportData = omitUndefinedFields({
    ...report,
    portalId: normalizedPortalId,
    submittedBy: userUid,
    status: 'pending_approval',
    revisionReason: '',
    savedAt: new Date().toISOString(),
  });
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'completedReports', reportId), reportData);
  batch.set(doc(firestore, 'jobProgress', `${jobId}_${userUid}`), {
    jobId,
    userUid,
    location,
    portalId: normalizedPortalId,
    doneCount: pointsCount,
    totalCount: pointsCount,
    progress: 100,
    submitted: false,
    completedReportId: reportId,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  await batch.commit();
}

export async function updateCompletedReportReviewInFirestore(
  reportId: string,
  portalId: string,
  status: 'approved' | 'needs_revision',
  revisionReason: string,
  reviewerUid: string
): Promise<void> {
  if (!isFirebaseConfigured || !firestore || !reportId || !portalId || !reviewerUid) {
    throw new Error('Data review laporan tidak lengkap.');
  }
  if (status === 'needs_revision' && !revisionReason.trim()) {
    throw new Error('Alasan revisi wajib diisi.');
  }
  await updateDoc(doc(firestore, 'completedReports', reportId), {
    status,
    revisionReason: status === 'needs_revision' ? revisionReason.trim() : '',
    reviewedBy: reviewerUid,
    reviewedAt: new Date().toISOString(),
  });
}

export async function loadCompletedReportsFromFirestore(userUid?: string, portalId?: string): Promise<Record<string, unknown>[]> {
  if (!isFirebaseConfigured || !firestore) return [];
  const reportsQuery = userUid
    ? portalId
      ? query(
          collection(firestore, 'completedReports'),
          where('submittedBy', '==', userUid),
          where('portalId', '==', normalizePortalAddress(portalId))
        )
      : null
    : portalId
      ? query(collection(firestore, 'completedReports'), where('portalId', '==', normalizePortalAddress(portalId)))
      : null;
  if (!reportsQuery) return [];
  const snapshot = await getDocs(reportsQuery);
  return snapshot.docs.map((item) => item.data());
}

export function subscribeToCompletedReportsFromFirestore(
  portalId: string,
  onReports: (reports: Record<string, unknown>[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured || !firestore || !portalId) return () => undefined;
  const reportsQuery = query(
    collection(firestore, 'completedReports'),
    where('portalId', '==', normalizePortalAddress(portalId))
  );
  return onSnapshot(
    reportsQuery,
    (snapshot) => onReports(snapshot.docs.map((item) => item.data())),
    (error) => onError?.(error)
  );
}

export function subscribeToCompletedReportsForUserFromFirestore(
  userUid: string,
  portalId: string,
  onReports: (reports: Record<string, unknown>[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured || !firestore || !userUid || !portalId) return () => undefined;
  const reportsQuery = query(
    collection(firestore, 'completedReports'),
    where('submittedBy', '==', userUid),
    where('portalId', '==', normalizePortalAddress(portalId))
  );
  return onSnapshot(
    reportsQuery,
    (snapshot) => onReports(snapshot.docs.map((item) => item.data())),
    (error) => onError?.(error)
  );
}

export function hasRealPortalLocation(config: PortalMasterConfig): boolean {
  return config.masterWilayah.length > 0 || config.masterGroups.some((region: RegionConfig) => region.locations.length > 0);
}
