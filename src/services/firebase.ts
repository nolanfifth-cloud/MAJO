import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  query,
  collection,
  where,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { RegisteredAccount } from '../types';

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
export const firestore = app ? getFirestore(app) : null;

export async function registerAdminWithFirebase(
  account: Omit<RegisteredAccount, 'password'>,
  password: string
): Promise<void> {
  if (!firebaseAuth || !firestore) throw new Error('Firebase belum dikonfigurasi.');
  const credential = await createUserWithEmailAndPassword(firebaseAuth, account.email!, password);
  await setDoc(doc(firestore, 'users', credential.user.uid), {
    ...account,
    email: account.email!.toLowerCase(),
    username: account.username.toLowerCase(),
    role: 'admin',
  });
}

async function resolveEmail(credential: string): Promise<string> {
  if (!firestore) throw new Error('Firebase belum dikonfigurasi.');
  if (credential.includes('@')) return credential;
  const usersQuery = query(collection(firestore, 'users'), where('username', '==', credential), where('role', '==', 'admin'));
  const snapshot = await getDocs(usersQuery);
  if (snapshot.empty) throw new Error('Akun tidak ditemukan.');
  return snapshot.docs[0].data().email as string;
}

export async function loginWithFirebase(credential: string, password: string): Promise<RegisteredAccount> {
  if (!firebaseAuth || !firestore) throw new Error('Firebase belum dikonfigurasi.');
  const email = await resolveEmail(credential.trim().toLowerCase());
  const result: UserCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const profileSnapshot = await getDoc(doc(firestore, 'users', result.user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
  return {
    name: (profile.name as string) || result.user.displayName || email,
    username: (profile.username as string) || email,
    email,
    role: (profile.role as 'admin' | 'user') || 'admin',
    portalAddress: (profile.portalAddress as string) || '',
    location: profile.location as string | undefined,
    createdAt: (profile.createdAt as string) || new Date().toISOString(),
  };
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  if (!firebaseAuth) throw new Error('Firebase belum dikonfigurasi.');
  await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
}
