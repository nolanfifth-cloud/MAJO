import { initializeApp, getApps } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signOut,
  signInWithEmailAndPassword,
  updatePassword,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteField,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { RegisteredAccount } from '../types';
import { normalizePortalAddress } from './workflowStore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);
const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const authPersistenceReady = firebaseAuth
  ? setPersistence(firebaseAuth, browserLocalPersistence)
  : Promise.resolve();
export const firestore = app ? getFirestore(app) : null;
const firebaseFunctions = app ? getFunctions(app) : null;

export { onAuthStateChanged, signOut };
export function sanitizeCachedAccountPasswords(): void {
  try {
    const cached = JSON.parse(localStorage.getItem('majo_accounts') || '[]');
    if (!Array.isArray(cached)) return;
    const safeAccounts = cached.map((item: RegisteredAccount) => {
      const { password: _password, ...safeAccount } = item;
      return safeAccount;
    });
    localStorage.setItem('majo_accounts', JSON.stringify(safeAccounts));
  } catch {
    // Preserve account metadata if browser storage contains invalid data.
  }
}


export async function changeFirebasePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = firebaseAuth?.currentUser;
  if (!user?.email) throw new Error('Sesi Firebase tidak aktif. Silakan login ulang.');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export interface PasswordResetRequestPayload {
  username: string;
  portalAddress: string;
  employeeId?: string;
  notes?: string;
}

export async function submitPasswordResetRequest(payload: PasswordResetRequestPayload): Promise<string> {
  if (!firebaseFunctions) throw new Error('Firebase Functions belum dikonfigurasi.');
  const submitRequest = httpsCallable<PasswordResetRequestPayload, { ticketId: string }>(
    firebaseFunctions,
    'submitPasswordResetRequest'
  );
  const response = await submitRequest(payload);
  return response.data.ticketId;
}

export async function resetPasswordFromRequest(ticketId: string): Promise<string> {
  if (!firebaseFunctions) throw new Error('Firebase Functions belum dikonfigurasi.');
  const resetRequest = httpsCallable<{ ticketId: string }, { temporaryPassword: string }>(
    firebaseFunctions,
    'resetPasswordFromRequest'
  );
  const response = await resetRequest({ ticketId });
  return response.data.temporaryPassword;
}

async function hashAdminInviteCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code.trim().toUpperCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createAdminInvitation(): Promise<string> {
  if (!firebaseAuth?.currentUser || !firestore) throw new Error('Sesi Firebase admin tidak aktif.');

  const adminUid = firebaseAuth.currentUser.uid;
  const adminSnapshot = await getDoc(doc(firestore, 'users', adminUid));
  const adminProfile = adminSnapshot.data();
  const portalAddress = normalizePortalAddress(String(adminProfile?.portalAddress || ''));
  if (!adminSnapshot.exists() || adminProfile?.role !== 'admin' || !portalAddress) {
    throw new Error('Hanya admin portal aktif yang dapat menerbitkan undangan.');
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const invitationCode = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  const invitationId = await hashAdminInviteCode(invitationCode);
  await setDoc(doc(firestore, 'adminInvites', invitationId), {
    portalAddress,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return invitationCode;
}

export async function resolveAdminInvitation(code: string): Promise<string> {
  if (!firestore) throw new Error('Firebase belum dikonfigurasi.');
  const normalizedCode = code.trim().toUpperCase();
  if (!/^[A-F0-9]{48}$/.test(normalizedCode)) {
    throw new Error('Masukkan kode undangan admin yang valid.');
  }

  const invitationId = await hashAdminInviteCode(normalizedCode);
  const invitationSnapshot = await getDoc(doc(firestore, 'adminInvites', invitationId));
  if (!invitationSnapshot.exists()) {
    throw new Error('Kode undangan tidak valid, sudah digunakan, atau kedaluwarsa.');
  }

  const invitation = invitationSnapshot.data();
  if (invitation.usedBy || !(invitation.expiresAt instanceof Timestamp) || invitation.expiresAt.toMillis() <= Date.now()) {
    throw new Error('Kode undangan tidak valid, sudah digunakan, atau kedaluwarsa.');
  }

  const portalAddress = normalizePortalAddress(String(invitation.portalAddress || ''));
  if (!portalAddress) throw new Error('Undangan tidak terhubung ke portal yang valid.');
  return portalAddress;
}

async function getInternalUserAuthEmail(username: string): Promise<string> {
  const normalizedUsername = username.trim().toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedUsername));
  const identifier = Array.from(new Uint8Array(digest).slice(0, 20), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `user-${identifier}@users.majo.id`;
}

async function removeLegacyStoredPassword(uid: string, profile: Record<string, unknown>): Promise<void> {
  if (firestore && 'password' in profile) {
    try {
      await updateDoc(doc(firestore, 'users', uid), { password: deleteField() });
    } catch (error) {
      console.warn('Could not remove the legacy password field from the user profile.', error);
    }
  }

  try {
    const cached = JSON.parse(localStorage.getItem('majo_accounts') || '[]');
    if (!Array.isArray(cached)) return;
    const safeAccounts = cached.map((item: RegisteredAccount) => {
      const { password: _password, ...safeAccount } = item;
      return safeAccount;
    });
    localStorage.setItem('majo_accounts', JSON.stringify(safeAccounts));
  } catch {
    // Ignore local cache issues.
  }
}

export async function registerAccountWithFirebase(
  account: Omit<RegisteredAccount, 'password'>,
  password: string,
  adminInviteCode?: string
): Promise<string> {
  if (!firebaseAuth || !firestore) throw new Error('Firebase belum dikonfigurasi.');
  if (account.role === 'admin' && !adminInviteCode) {
    throw new Error('Kode undangan admin wajib diisi.');
  }
  const invitationId = account.role === 'admin' ? await hashAdminInviteCode(adminInviteCode!) : undefined;
  const authEmail = account.role === 'user'
    ? await getInternalUserAuthEmail(account.username)
    : account.email?.trim().toLowerCase();
  if (!authEmail) throw new Error('Email admin wajib diisi untuk autentikasi Firebase.');
  const credential = await createUserWithEmailAndPassword(firebaseAuth, authEmail, password);

  const profile = {
    name: account.name,
    email: authEmail,
    username: account.username.toLowerCase(),
    role: account.role,
    portalAddress: account.portalAddress,
    ...(account.portalId ? { portalId: account.portalId } : {}),
    ...(account.location ? { location: account.location } : {}),
    createdAt: account.createdAt,
  };

  const userRef = doc(firestore, 'users', credential.user.uid);
  if (account.role === 'admin' && invitationId) {
    const invitationRef = doc(firestore, 'adminInvites', invitationId);
    try {
      await runTransaction(firestore, async (transaction) => {
        const invitationSnapshot = await transaction.get(invitationRef);
        if (!invitationSnapshot.exists()) {
          throw new Error('Kode undangan tidak valid, sudah digunakan, atau kedaluwarsa.');
        }
        const invitation = invitationSnapshot.data();
        if (
          invitation.usedBy
          || !(invitation.expiresAt instanceof Timestamp)
          || invitation.expiresAt.toMillis() <= Date.now()
        ) {
          throw new Error('Kode undangan tidak valid, sudah digunakan, atau kedaluwarsa.');
        }
        transaction.update(invitationRef, {
          usedBy: credential.user.uid,
          usedAt: serverTimestamp(),
        });
        transaction.set(userRef, { ...profile, adminInviteId: invitationId });
      });
      try {
        await updateDoc(userRef, { adminInviteId: deleteField() });
      } catch {
        // The consumed invitation digest is harmless if cleanup is unavailable.
      }
    } catch (error) {
      try {
        await deleteUser(credential.user);
      } catch {
        // Preserve the original registration error.
      }
      throw error;
    }
  } else {
    await setDoc(userRef, profile);
  }

  try {
    const cached = JSON.parse(localStorage.getItem('majo_accounts') || '[]');
    const nextAccounts = Array.isArray(cached)
      ? cached.map((item: RegisteredAccount) => {
          const { password: _password, ...safeAccount } = item;
          return safeAccount;
        })
      : [];
    const existingIndex = nextAccounts.findIndex((item: RegisteredAccount) => item.username?.toLowerCase() === account.username.toLowerCase());
    if (existingIndex >= 0) {
      nextAccounts[existingIndex] = { ...profile, uid: credential.user.uid };
    } else {
      nextAccounts.push({ ...profile, uid: credential.user.uid });
    }
    localStorage.setItem('majo_accounts', JSON.stringify(nextAccounts));
  } catch {
    // Ignore local cache issues.
  }
  return credential.user.uid;
}

export const registerAdminWithFirebase = registerAccountWithFirebase;

export async function loginWithFirebase(credential: string, password: string): Promise<RegisteredAccount> {
  if (!firebaseAuth || !firestore) throw new Error('Firebase belum dikonfigurasi.');
  const normalizedCredential = credential.trim().toLowerCase();
  let email = normalizedCredential;
  if (!normalizedCredential.includes('@')) {
    try {
      const cachedAccounts = JSON.parse(localStorage.getItem('majo_accounts') || '[]') as RegisteredAccount[];
      const cachedAccount = Array.isArray(cachedAccounts)
        ? cachedAccounts.find((account) => account.username?.toLowerCase() === normalizedCredential && account.email)
        : undefined;
      email = cachedAccount?.email?.toLowerCase() || await getInternalUserAuthEmail(normalizedCredential);
    } catch {
      email = await getInternalUserAuthEmail(normalizedCredential);
    }
  }
  await authPersistenceReady;
  const result: UserCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const profileSnapshot = await getDoc(doc(firestore, 'users', result.user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
  await removeLegacyStoredPassword(result.user.uid, profile);
  return {
    uid: result.user.uid,
    name: (profile.name as string) || result.user.displayName || email,
    username: (profile.username as string) || email,
    email,
    role: (profile.role as 'admin' | 'user') || 'admin',
    portalAddress: (profile.portalAddress as string) || '',
    location: profile.location as string | undefined,
    createdAt: (profile.createdAt as string) || new Date().toISOString(),
  };
}
export async function getRegisteredAccountForFirebaseUser(user: User): Promise<RegisteredAccount> {
  if (!firestore) throw new Error('Firebase belum dikonfigurasi.');
  const profileSnapshot = await getDoc(doc(firestore, 'users', user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
  await removeLegacyStoredPassword(user.uid, profile);
  return {
    uid: user.uid,
    name: (profile.name as string) || user.displayName || user.email || '',
    username: (profile.username as string) || user.email || '',
    email: user.email || undefined,
    role: (profile.role as 'admin' | 'user') || 'admin',
    portalAddress: (profile.portalAddress as string) || '',
    location: profile.location as string | undefined,
    createdAt: (profile.createdAt as string) || new Date().toISOString(),
  };
}

