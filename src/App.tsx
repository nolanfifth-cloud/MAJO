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

export default function App() {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
      } catch {
        if (!cancelled) setCurrentView('login');
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
    setCurrentUser({ username: '', name: '', role: 'user', location: '', email: '', portalAddress: '', createdAt: '' });
    setCurrentView('login');
  };

  if (isAuthLoading) {
    return <div className="min-h-screen w-full bg-surface-container-lowest" />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-surface-container-lowest" />}>
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
