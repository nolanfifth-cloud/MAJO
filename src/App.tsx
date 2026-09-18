/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AuthView, RegisteredAccount } from './types';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { ForgotPasswordView } from './components/ForgotPasswordView';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [prefilledUsername, setPrefilledUsername] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    name?: string;
    role: 'admin' | 'user';
    location?: string;
  }>({
    username: '',
    name: '',
    role: 'user',
    location: '',
  });

  const handleRegisterSuccess = (account: RegisteredAccount) => {
    setPrefilledUsername(account.username);
    setCurrentUser({
      username: account.username,
      name: account.name,
      role: account.role,
      location: account.location,
    });
  };

  const handleLoginSuccess = (user: {
    username: string;
    name?: string;
    role: 'admin' | 'user';
    location?: string;
  }) => {
    setCurrentUser(user);
  };

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
          currentUser={currentUser}
        />
      )}

      {currentView === 'user_dashboard' && (
        <UserDashboard
          onNavigate={(view) => setCurrentView(view)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
