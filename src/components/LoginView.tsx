import React, { useState } from 'react';
import { AuthView, RegisteredAccount } from '../types';

const LOGO_URL = '/assets/majo-logo.svg';

interface LoginViewProps {
  onNavigate: (view: AuthView) => void;
  prefilledUsername?: string;
  onLoginSuccess?: (user: { username: string; name?: string; role: 'admin' | 'user' }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigate,
  prefilledUsername = '',
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState(prefilledUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccessUser, setLoginSuccessUser] = useState<string | null>(null);
  const [loggedInRole, setLoggedInRole] = useState<'admin' | 'user'>('admin');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Harap masukkan username Anda.');
      return;
    }
    if (!password) {
      setErrorMessage('Harap masukkan kata sandi.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      let foundAccount: RegisteredAccount | undefined;
      try {
        const stored = localStorage.getItem('majo_accounts');
        if (stored) {
          const accounts: RegisteredAccount[] = JSON.parse(stored);
          const credential = username.trim().toLowerCase();
          foundAccount = accounts.find(
            (account) => account.username?.toLowerCase() === credential || account.email?.toLowerCase() === credential
          );
        }
      } catch {
        foundAccount = undefined;
      }

      if (!foundAccount || foundAccount.password !== password) {
        setErrorMessage('Username/email atau kata sandi tidak sesuai.');
        return;
      }

      const role = foundAccount.role;
      const displayName = foundAccount.name || username;
      setLoginSuccessUser(foundAccount.username);

      setLoggedInRole(role);

      if (onLoginSuccess) {
        onLoginSuccess({ username: foundAccount.username, name: displayName, role });
      }

      // Navigate to appropriate dashboard based on user role
      if (role === 'admin') {
        onNavigate('admin_dashboard');
      } else {
        onNavigate('user_dashboard');
      }
    }, 900);
  };

  const handleLogout = () => {
    setLoginSuccessUser(null);
    setPassword('');
  };

  return (
    <div id="login-container" className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest">
      {/* Sisi KIRI: Branding & Informasi Web MAJO (Full Screen Split) */}
      <div className="lg:col-span-6 bg-gradient-to-br from-surface-container-low via-surface to-secondary-container/20 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-outline-variant/20 min-h-full">
        {/* Subtle Decorative Background Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-secondary-container/30 blur-3xl pointer-events-none"></div>

        {/* Top Header & Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-lg bg-surface-container-lowest shadow-sm flex items-center justify-center p-2 border border-outline-variant/30">
              <img
                alt="MAJO Logo"
                className="w-full h-full object-contain select-none"
                src={LOGO_URL}
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-on-surface">MAJO</span>
              </div>
              <p className="text-xs text-secondary font-medium">
                <b>Halaman Login untuk Seluruh Admin dan User</b>
              </p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl text-on-surface tracking-tight leading-snug font-bold">
              Platform Dengan Tujuan Pemantauan Operasional Lapangan Seluruh Cabang
            </h2>
            <p className="text-sm text-secondary mt-3 leading-relaxed max-w-xl">
              Kelola penugasan, monitoring preventif maintenance (PM), serta validasi aktivitas teknisi
              lapangan lintas wilayah kerja secara terkoordinasi dan realtime.
            </p>
          </div>
        </div>

        {/* Poin-Poin Keunggulan Portal */}
        <div className="relative z-10 my-8 flex flex-col gap-3.5 max-w-xl">
          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-surface-container-lowest/70 border border-outline-variant/25 shadow-sm backdrop-blur-sm">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-on-surface">Monitoring Multi-Wilayah</span>
              <span className="text-xs text-secondary">
                Pantau progres tugas lapangan dan status cabang (batam, pekanbaru, Palembang, medan,
                dumai, dll).
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-surface-container-lowest/70 border border-outline-variant/25 shadow-sm backdrop-blur-sm">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">schema</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-on-surface">Delegasi & Skema Fleksibel</span>
              <span className="text-xs text-secondary">
                Manajemen struktur tim dan plotting jadwal operasional per regional kerja.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-surface-container-lowest/70 border border-outline-variant/25 shadow-sm backdrop-blur-sm">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-on-surface">
                Validasi Data Akurat & Bukti Audit
              </span>
              <span className="text-xs text-secondary">
                Dilengkapi lampiran foto fisik, checklist kondisi aset, dan audit trail otomatis.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-surface-container-lowest/70 border border-outline-variant/25 shadow-sm backdrop-blur-sm">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-on-surface">
                Akses Terenkripsi & Mandiri
              </span>
              <span className="text-xs text-secondary">
                Sistem kredensial privat aman berbasis enterprise tanpa ketergantungan luar.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Sisi Kiri */}
        <div className="relative z-10 pt-4 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
            Versi 1.1&nbsp;
          </span>
          <span>© Hak Cipta MAJO Portal</span>
        </div>
      </div>

      {/* Sisi KANAN: Formulir Login Full Screen & Lapang */}
      <div className="lg:col-span-6 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-surface-container-lowest relative min-h-full">
        <div className="w-full max-w-md mx-auto">
          {/* Status Micro Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-surface-container text-secondary text-[11px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span>Portal Akses Terenkripsi</span>
          </div>

          {loginSuccessUser ? (
            /* Logged in success state */
            <div id="login-success-card" className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-sm animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[26px]">check_circle</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-1">
                Autentikasi Berhasil
              </h2>
              <p className="text-sm text-secondary mb-4 leading-relaxed">
                Selamat datang kembali di MAJO Portal, <strong className="text-on-surface font-semibold">@{loginSuccessUser}</strong>. Kredensial Anda terverifikasi dengan enkripsi aman.
              </p>
              <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-xs text-secondary space-y-1 mb-5">
                <div className="flex justify-between">
                  <span>Status Sesi:</span>
                  <span className="font-semibold text-emerald-600">Aktif & Terenkripsi</span>
                </div>
                <div className="flex justify-between">
                  <span>Hak Akses:</span>
                  <span className="font-semibold text-on-surface">Portal Terpadu</span>
                </div>
              </div>
              {loggedInRole === 'admin' ? (
                <button
                  id="go-admin-dashboard-btn"
                  type="button"
                  onClick={() => onNavigate('admin_dashboard')}
                  className="w-full h-12 rounded-full bg-[#091c33] text-white text-sm font-semibold hover:bg-[#162a47] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm mb-3"
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  <span>Buka Dashboard Admin</span>
                </button>
              ) : (
                <button
                  id="go-user-dashboard-btn"
                  type="button"
                  onClick={() => onNavigate('user_dashboard')}
                  className="w-full h-12 rounded-full bg-[#091c33] text-white text-sm font-semibold hover:bg-[#162a47] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm mb-3"
                >
                  <span className="material-symbols-outlined text-[18px]">engineering</span>
                  <span>Buka Dashboard User / Teknisi</span>
                </button>
              )}
              <button
                id="logout-btn"
                type="button"
                onClick={handleLogout}
                className="w-full h-12 rounded-full bg-surface-container border border-outline-variant/40 text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Keluar / Masuk Akun Lain</span>
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          ) : (
            <>
              {/* Header Form */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">
                  Masuk ke Akun Anda
                </h1>
                <p className="text-sm text-secondary mt-1.5">
                  Silakan masukkan kredensial portal resmi yang telah terdaftar
                </p>
              </div>

              {errorMessage && (
                <div id="login-error-alert" className="mb-5 p-3.5 rounded-xl bg-error-container/50 border border-error/20 text-error text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Credential Form */}
              <form
                id="majoLoginForm"
                onSubmit={handleLoginSubmit}
                className="w-full flex flex-col gap-5"
              >
                {/* Field: Username */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11px] font-bold text-secondary uppercase tracking-wider px-1"
                    htmlFor="usernameInput"
                  >
                    <b>Username atau Email</b>
                  </label>
                  <div className="relative flex items-center w-full group">
                    <div className="absolute left-4 flex items-center justify-center pointer-events-none text-secondary group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                    </div>
                    <input
                      autoComplete="username"
                      className="w-full h-14 pl-12 pr-4 bg-surface-container-low text-on-surface text-sm placeholder:text-outline rounded-full outline-none transition-all duration-200 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                      id="usernameInput"
                      name="username"
                      placeholder="Username atau email admin"
                      required
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field: Kata Sandi */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11px] font-bold text-secondary uppercase tracking-wider px-1"
                    htmlFor="passwordInput"
                  >
                    <b>Kata Sandi</b>
                  </label>
                  <div className="relative flex items-center w-full group">
                    <div className="absolute left-4 flex items-center justify-center pointer-events-none text-secondary group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                    </div>
                    <input
                      autoComplete="current-password"
                      className="w-full h-14 pl-12 pr-12 bg-surface-container-low text-on-surface text-sm placeholder:text-outline rounded-full outline-none transition-all duration-200 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                      id="passwordInput"
                      name="password"
                      placeholder="Masukkan kata sandi"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Tampilkan atau sembunyikan kata sandi"
                      className="absolute right-3 w-10 h-10 flex items-center justify-center rounded-full text-secondary hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none cursor-pointer"
                      id="togglePasswordBtn"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]" id="passwordEyeIcon">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end pt-1">
                    <button
                      id="forgot-password-link"
                      type="button"
                      onClick={() => onNavigate('forgot_password')}
                      className="text-xs text-secondary hover:text-primary transition-colors duration-150 underline-offset-4 hover:underline cursor-pointer"
                    >
                      <b>Lupa password?</b>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    className="group w-full h-14 rounded-full bg-[#091c33] text-white text-base font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-[#162a47] active:scale-[0.985] transition-all duration-200 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
                    id="submitBtn"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span className="text-sm font-semibold">Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk</span>
                        <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom Account Registration Link */}
              <div className="mt-8 pt-6 border-t border-outline-variant/30 w-full flex justify-center items-center gap-1.5 text-xs text-secondary">
                <span>Belum punya akun?</span>
                <button
                  id="go-to-register-link"
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="font-semibold text-primary hover:text-primary-container transition-colors duration-150 underline-offset-4 hover:underline cursor-pointer"
                >
                  <b>Daftar</b>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
