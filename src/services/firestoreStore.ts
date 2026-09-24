import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { PmItem, RegisteredAccount, RegionConfig } from '../types';
import { firestore, isFirebaseConfigured } from './firebase';
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
  if (!isFirebaseConfigured || !firestore) return [];
  const snapshot = await getDocs(query(collection(firestore, 'jobs'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => item.data() as PmItem);
}

export async function loadJobsForLocationFromFirestore(location: string): Promise<PmItem[]> {
  if (!isFirebaseConfigured || !firestore || !location) return [];
  const snapshot = await getDocs(
    query(collection(firestore, 'jobs'), where('targetWilayahList', 'array-contains', location))
  );
  return snapshot.docs.map((item) => item.data() as PmItem);
}

export async function saveJobProgressToFirestore(
  jobId: string,
  userUid: string,
  location: string,
  devices: unknown[],
  summary?: { progress: number; doneCount: number; totalCount: number }
): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;
  const progressId = `${jobId}_${userUid}`;
  await setDoc(doc(firestore, 'jobProgress', progressId), {
    jobId,
    userUid,
    location,
    devices,
    ...(summary || {}),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function loadJobProgressFromFirestore(): Promise<Record<string, unknown>[]> {
  if (!isFirebaseConfigured || !firestore) return [];
  const snapshot = await getDocs(collection(firestore, 'jobProgress'));
  return snapshot.docs.map((item) => item.data());
}

export async function loadRegisteredAccountsFromFirestore(): Promise<RegisteredAccount[]> {
  if (!isFirebaseConfigured || !firestore) return [];
  const snapshot = await getDocs(collection(firestore, 'users'));
  return snapshot.docs.map((item) => ({
    uid: item.id,
    ...(item.data() as RegisteredAccount),
  }));
}

export async function saveAdminJobToFirestore(job: PmItem, adminUid?: string): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;
  await setDoc(doc(firestore, 'jobs', job.id), {
    ...job,
    createdAt: new Date().toISOString(),
    createdBy: adminUid || null,
  });
}

export async function saveCompletedReportToFirestore(report: Record<string, unknown>, userUid?: string): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;
  const reportId = String(report.id || `${Date.now()}`);
  await setDoc(doc(firestore, 'completedReports', reportId), {
    ...report,
    submittedBy: userUid || null,
    savedAt: new Date().toISOString(),
  });
}

export async function loadCompletedReportsFromFirestore(userUid?: string): Promise<Record<string, unknown>[]> {
  if (!isFirebaseConfigured || !firestore) return [];
  const reportsQuery = userUid
    ? query(collection(firestore, 'completedReports'), where('submittedBy', '==', userUid), orderBy('savedAt', 'desc'))
    : query(collection(firestore, 'completedReports'), orderBy('savedAt', 'desc'));
  const snapshot = await getDocs(reportsQuery);
  return snapshot.docs.map((item) => item.data());
}

export function hasRealPortalLocation(config: PortalMasterConfig): boolean {
  return config.masterWilayah.length > 0 || config.masterGroups.some((region: RegionConfig) => region.locations.length > 0);
}
