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
} from 'firebase/firestore';
import { PmItem, RegisteredAccount, RegionConfig } from '../types';
import { firebaseAuth, firestore, isFirebaseConfigured } from './firebase';
import { PortalMasterConfig, getActivePortalAddress, normalizePortalAddress } from './workflowStore';

const portalDocId = (portalAddress?: string): string => {
  const target = normalizePortalAddress(portalAddress || getActivePortalAddress() || 'portal');
  return target || 'portal';
};

const portalDoc = (portalAddress?: string) => {
  if (!firestore) throw new Error('Firebase belum dikonfigurasi.');
  return doc(firestore, 'appConfig', portalDocId(portalAddress));
};

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
  const profileSnapshot = await getDoc(doc(database, 'users', authenticatedUid));
  const profile = profileSnapshot.data();
  const portalId = normalizePortalAddress(String(profile?.portalAddress || ''));
  const location = String(profile?.location || '');
  if (!profileSnapshot.exists() || profile?.role !== 'user' || !portalId || !location) return [];

  let snapshot;
  try {
    snapshot = await getDocs(query(
      collection(database, 'jobs'),
      where('targetUserUids', 'array-contains', authenticatedUid)
    ));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan Firestore tidak diketahui.';
    throw new Error(`Gagal membaca PM untuk akun dan portal ini: ${message}`);
  }
  return snapshot.docs
    .map((item) => ({ ...(item.data() as PmItem), id: item.id }))
    .filter((job) =>
      normalizePortalAddress(job.portalId || '') === portalId
      && job.targetWilayahList?.includes(location)
    )
    .map((job) => ({ ...job, portalId }));
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
  await setDoc(doc(firestore, 'jobProgress', progressId), {
    jobId,
    userUid,
    location,
    portalId: normalizePortalAddress(portalId),
    ...(technicianName ? { technicianName } : {}),
    devices,
    ...(summary || {}),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
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

export async function saveAdminJobToFirestore(job: PmItem, adminUid: string, portalId: string): Promise<string | null> {
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
  const existingJobSnapshot = await getDoc(jobRef);
  const existingJob = existingJobSnapshot.exists() ? existingJobSnapshot.data() : null;
  if (existingJob && normalizePortalAddress(String(existingJob.portalId || '')) !== normalizedPortalId) {
    throw new Error('Pekerjaan ini bukan bagian dari portal admin yang sedang aktif.');
  }
  const creatorMetadata = existingJobSnapshot.exists()
    ? existingJob && Object.prototype.hasOwnProperty.call(existingJob, 'createdBy')
      ? { createdBy: existingJob.createdBy }
      : {}
    : { createdBy: job.createdBy || adminUid };
  await setDoc(jobRef, {
    ...job,
    portalId: normalizedPortalId,
    targetUserUids,
    createdAt: typeof existingJob?.createdAt === 'string'
      ? existingJob.createdAt
      : job.createdAt || new Date().toISOString(),
    ...creatorMetadata,
  });
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

export async function saveCompletedReportToFirestore(report: Record<string, unknown>, userUid: string, portalId: string): Promise<void> {
  if (!isFirebaseConfigured || !firestore || !userUid || !portalId) return;
  const reportId = String(report.id || `${Date.now()}`);
  await setDoc(doc(firestore, 'completedReports', reportId), {
    ...report,
    portalId: normalizePortalAddress(portalId),
    submittedBy: userUid,
    savedAt: new Date().toISOString(),
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

export function hasRealPortalLocation(config: PortalMasterConfig): boolean {
  return config.masterWilayah.length > 0 || config.masterGroups.some((region: RegionConfig) => region.locations.length > 0);
}
