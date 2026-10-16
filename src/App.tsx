/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthView, RegisteredAccount } from './types';
import {
  authPersistenceReady,
  firebaseAuth,
  getRegisteredAccountForFirebaseUser,
  isFirebaseConfigured,
  onAuthStateChanged,
  sanitizeCachedAccountPasswords,
  signOut,
} from './services/firebase';
import { setActivePortalAddress } from './services/workflowStore';

const LoginView = lazy(() => import('./components/LoginView').then((module) => ({ default: module.LoginView })));
const RegisterView = lazy(() => import('./components/RegisterView').then((module) => ({ default: module.RegisterView })));
const ForgotPasswordView = lazy(() => import('./components/ForgotPasswordView').then((module) => ({ default: module.ForgotPasswordView })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const UserDashboard = lazy(() => import('./components/UserDashboard').then((module) => ({ default: module.UserDashboard })));

function PageLoading({ message }: { message: string }) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-surface-container-lowest px-5 text-center"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-primary/15 border-t-primary"
      />
      <span className="text-sm font-semibold text-on-surface-variant">{message}</span>
    </main>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authRestoreError, setAuthRestoreError] = useState('');
  const [prefilledUsername, setPrefilledUsername] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    uid?: string;
    username: string;
    name?: string;
    role: 'admin' | 'user';
    location?: string;
    email?: string;
    portalAddress?: string;
    createdAt?: string;
  }>({
    username: '',
    name: '',
    role: 'user',
    location: '',
    email: '',
    portalAddress: '',
    createdAt: '',
  });

  useEffect(() => {
    let cancelled = false;
    sanitizeCachedAccountPasswords();

    if (!isFirebaseConfigured || !firebaseAuth) {
      setCurrentView('login');
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setCurrentView('login');
          setIsAuthLoading(false);
        }
        return;
      }

      try {
        await authPersistenceReady;
        const account = await getRegisteredAccountForFirebaseUser(user);
        if (cancelled) return;
        const restoredUser = {
          uid: account.uid,
          username: account.username,
          name: account.name,
          role: account.role,
          location: account.location,
          email: account.email,
          portalAddress: account.portalAddress,
          createdAt: account.createdAt,
        };
        setCurrentUser(restoredUser);
        localStorage.setItem('majo_session', JSON.stringify(restoredUser));
        if (restoredUser.portalAddress) {
          setActivePortalAddress(restoredUser.portalAddress, restoredUser.uid || restoredUser.username);
        }
        setCurrentView(account.role === 'admin' ? 'admin_dashboard' : 'user_dashboard');
      } catch (error) {
        if (!cancelled) {
          setCurrentView('login');
          setAuthRestoreError(
            error instanceof Error
              ? error.message
              : 'Sesi berhasil ditemukan, tetapi profil Firebase gagal dimuat.'
          );
        }
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleRegisterSuccess = (account: RegisteredAccount) => {
    setPrefilledUsername(account.username);
    setCurrentUser({
      uid: account.uid,
      username: account.username,
      name: account.name,
      role: account.role,
      location: account.location,
      email: account.email,
      portalAddress: account.portalAddress,
      createdAt: account.createdAt,
    });
    localStorage.setItem('majo_session', JSON.stringify({
      uid: account.uid,
      username: account.username,
      name: account.name,
      role: account.role,
      location: account.location,
      portalAddress: account.portalAddress,
    }));
    if (account.portalAddress) {
      setActivePortalAddress(account.portalAddress, account.uid || account.username);
    }
    setCurrentView(account.role === 'admin' ? 'admin_dashboard' : 'user_dashboard');
  };

  const handleLoginSuccess = (user: {
    uid?: string;
    username: string;
    name?: string;
    role: 'admin' | 'user';
    location?: string;
    email?: string;
    portalAddress?: string;
    createdAt?: string;
  }) => {
    setCurrentUser(user);
    localStorage.setItem('majo_session', JSON.stringify(user));
    if (user.portalAddress) {
      setActivePortalAddress(user.portalAddress, user.uid || user.username);
    }
  };

  const handleLogout = async () => {
    if (firebaseAuth) await signOut(firebaseAuth);
    localStorage.removeItem('majo_session');
    localStorage.removeItem('majo_active_portal_address');
    setAuthRestoreError('');
    setCurrentUser({ username: '', name: '', role: 'user', location: '', email: '', portalAddress: '', createdAt: '' });
    setCurrentView('login');
  };

  if (isAuthLoading) {
    return <PageLoading message="Memeriksa sesi akun..." />;
  }

  if (authRestoreError) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-surface-container-lowest px-4 py-8">
        <section
          aria-labelledby="auth-restore-error-title"
          className="w-full max-w-lg rounded-2xl border border-error/20 bg-white p-6 shadow-sm sm:p-8"
          role="alert"
        >
          <h1 id="auth-restore-error-title" className="text-lg font-bold text-on-surface">
            Sesi Firebase gagal dipulihkan
          </h1>
          <p className="mt-3 break-words text-sm leading-relaxed text-on-surface-variant">
            {authRestoreError}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                void handleLogout().catch((error: unknown) => {
                  setAuthRestoreError(
                    error instanceof Error ? error.message : 'Gagal mengakhiri sesi Firebase.'
                  );
                });
              }}
              className="min-h-11 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
            >
              Keluar dari sesi
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
            >
              Muat ulang halaman
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <Suspense fallback={<PageLoading message="Memuat halaman..." />}>
      <div className="min-h-screen w-full relative">
        {currentView === 'login' && (
          <LoginView
            onNavigate={(view) => setCurrentView(view)}
            prefilledUsername={prefilledUsername}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentView === 'register' && (
          <RegisterView
            onNavigate={(view) => setCurrentView(view)}
            onRegisterSuccess={handleRegisterSuccess}
          />
        )}

        {currentView === 'forgot_password' && (
          <ForgotPasswordView onNavigate={(view) => setCurrentView(view)} />
        )}

        {currentView === 'admin_dashboard' && (
          <AdminDashboard
            onNavigate={(view) => setCurrentView(view)}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        )}

        {currentView === 'user_dashboard' && (
          <UserDashboard
            onNavigate={(view) => setCurrentView(view)}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        )}
      </div>
    </Suspense>
  );
}
