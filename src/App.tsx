/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AuthView, RegisteredAccount } from './types';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { ForgotPasswordView } from './components/ForgotPasswordView';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import {
  authPersistenceReady,
  firebaseAuth,
  getRegisteredAccountForFirebaseUser,
  isFirebaseConfigured,
  onAuthStateChanged,
  signOut,
} from './services/firebase';
import { setActivePortalAddress } from './services/workflowStore';

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

    if (!isFirebaseConfigured || !firebaseAuth) {
      try {
        const storedSession = localStorage.getItem('majo_session');
        if (storedSession) {
          const user = JSON.parse(storedSession) as typeof currentUser;
          setCurrentUser(user);
          setCurrentView(user.role === 'admin' ? 'admin_dashboard' : 'user_dashboard');
        }
      } catch {
        localStorage.removeItem('majo_session');
      } finally {
        setIsAuthLoading(false);
      }
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
    try {
      const session = localStorage.getItem('majo_session');
      if (session) {
        const parsed = JSON.parse(session) as { uid?: string; username?: string };
        const identity = parsed.uid ? `uid_${parsed.uid}` : parsed.username ? `user_${parsed.username.toLowerCase()}` : '';
        if (identity) {
          localStorage.removeItem(`majo_active_portal_address_${identity}`);
        }
      }
    } catch {
      // Ignore legacy session parsing issues.
    }
    localStorage.removeItem('majo_active_portal_address');
    setCurrentUser({ username: '', name: '', role: 'user', location: '', email: '', portalAddress: '', createdAt: '' });
    setCurrentView('login');
  };

  if (isAuthLoading) {
    return <div className="min-h-screen w-full bg-surface-container-lowest" />;
  }

  return (
    <div className="min-h-screen w-full relative">
      {/* Primary Screen Render */}
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
  );
}
