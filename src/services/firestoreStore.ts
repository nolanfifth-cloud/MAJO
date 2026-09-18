import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { PmItem, RegionConfig } from '../types';
import { firestore, isFirebaseConfigured } from './firebase';
import { PortalMasterConfig } from './workflowStore';

const portalDoc = () => {
  if (!firestore) throw new Error('Firebase belum dikonfigurasi.');
  return doc(firestore, 'appConfig', 'portal');
};

export async function loadPortalConfigFromFirestore(): Promise<PortalMasterConfig | null> {
  if (!isFirebaseConfigured || !firestore) return null;
  const snapshot = await getDocs(query(collection(firestore, 'appConfig')));
  const portal = snapshot.docs.find((item) => item.id === 'portal');
  return portal?.exists() ? (portal.data() as PortalMasterConfig) : null;
}

export async function savePortalConfigToFirestore(config: PortalMasterConfig): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;
  await setDoc(portalDoc(), config, { merge: true });
}

export async function loadAdminJobsFromFirestore(): Promise<PmItem[]> {
  if (!isFirebaseConfigured || !firestore) return [];
  const snapshot = await getDocs(query(collection(firestore, 'jobs'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => item.data() as PmItem);
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

export async function loadCompletedReportsFromFirestore(): Promise<Record<string, unknown>[]> {
  if (!isFirebaseConfigured || !firestore) return [];
  const snapshot = await getDocs(query(collection(firestore, 'completedReports'), orderBy('savedAt', 'desc')));
  return snapshot.docs.map((item) => item.data());
}

export function hasRealPortalLocation(config: PortalMasterConfig): boolean {
  return config.masterWilayah.length > 0 || config.masterGroups.some((region: RegionConfig) => region.locations.length > 0);
}
