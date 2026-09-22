import React, { useState, useMemo, useEffect } from 'react';
import { AuthView, UserRole, RegisteredAccount } from '../types';
import {
  getPortalConfig,
  savePortalConfig,
  validatePortalAddress,
} from '../services/workflowStore';
import { isFirebaseConfigured, registerAccountWithFirebase } from '../services/firebase';
import { loadPortalConfigFromFirestore, savePortalConfigToFirestore } from '../services/firestoreStore';

const LOGO_URL = '/assets/logo%20MAJO.png';

interface RegisterViewProps {
  onNavigate: (view: AuthView) => void;
  onRegisterSuccess?: (account: RegisteredAccount) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onNavigate,
  onRegisterSuccess,
}) => {
  const [portalConfig, setPortalConfig] = useState(() => getPortalConfig());
  const [role, setRole] = useState<UserRole>('admin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [portalAddress, setPortalAddress] = useState(
    role === 'admin' ? portalConfig.portalAddress : portalConfig.portalLink
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(
    portalConfig.masterWilayah[0] || 'Medan - Hub Operasional'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successAccount, setSuccessAccount] = useState<RegisteredAccount | null>(null);

  const availableLocations = useMemo(() => {
    const locations = [
      ...portalConfig.masterWilayah,
      ...portalConfig.masterGroups.flatMap((group) => group.locations),
    ];
    return Array.from(new Set(locations.filter(Boolean)));
  }, [portalConfig]);

  useEffect(() => {
    let cancelled = false;

    loadPortalConfigFromFirestore()
      .then((cloudConfig) => {
        if (!cloudConfig || cancelled) return;
        setPortalConfig(cloudConfig);
        savePortalConfig(cloudConfig);
      })
      .catch(() => {
        // The local portal configuration remains available offline.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (availableLocations.length > 0 && !availableLocations.includes(selectedLocation)) {
      setSelectedLocation(availableLocations[0]);
    }
  }, [availableLocations, selectedLocation]);

  // Validation state for user portal link
  const isPortalValid = useMemo(() => {
    if (role === 'admin') return true;
    return validatePortalAddress(portalAddress);
  }, [role, portalAddress]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setErrorMsg('');
    if (newRole === 'admin') {
      setPortalAddress(portalConfig.portalAddress || 'pt-majo-logistik-indo');
    } else {
      setPortalAddress(portalConfig.portalLink || 'portal.majo.id/org/pt-majo-logistik-indo');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (role === 'user') {
      if (!portalAddress.trim()) {
        setErrorMsg('Harap masukkan alamat / tautan portal dari Admin.');
        return;
      }
      if (!isPortalValid) {
        setErrorMsg(
          'Link Portal tidak terdaftar atau tidak sesuai dengan data Admin. Pendaftaran diblokir sampai tautan yang sah dimasukkan.'
        );
        return;
      }
      if (!selectedLocation) {
        setErrorMsg('Harap pilih Wilayah tempat Anda bekerja.');
        return;
      }
    } else {
      if (!portalAddress.trim()) {
        setErrorMsg('Harap masukkan alamat portal yang ingin dibuat.');
        return;
      }
    }

    if (!name.trim()) {
      setErrorMsg('Harap masukkan nama lengkap Anda.');
      return;
    }
    if (isFirebaseConfigured && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg(`Harap masukkan alamat email ${role === 'admin' ? 'admin' : 'akun'} yang valid.`);
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Harap masukkan username Anda.');
      return;
    }
    if (!password) {
      setErrorMsg('Harap masukkan kata sandi.');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('Kata sandi minimal 4 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Verifikasi kata sandi tidak cocok! Harap pastikan kedua kata sandi sama.');
      return;
    }

    setIsLoading(true);

    try {
      let updatedPortalConfig = portalConfig;
      // If admin, update portal config with the newly created portal address and permanent link
      if (role === 'admin') {
        const cleanSlug = portalAddress
          .trim()
          .toLowerCase()
          .replace(/\.majo\.id$/, '')
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const portalDomain = `${cleanSlug}.majo.id`;
        updatedPortalConfig = {
          ...portalConfig,
          portalAddress: portalDomain,
          portalLink: portalDomain,
          isActivated: true,
        };
        savePortalConfig(updatedPortalConfig);
      }

      const newAccount: RegisteredAccount = {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase() || undefined,
        password,
        role,
        portalAddress:
          role === 'admin'
            ? `${portalAddress.trim().toLowerCase().replace(/\.majo\.id$/, '')}.majo.id`
            : portalAddress.trim(),
        location: role === 'user' ? selectedLocation : undefined,
        createdAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        await registerAccountWithFirebase(newAccount, password);
        if (role === 'admin') {
          await savePortalConfigToFirestore(updatedPortalConfig);
        }
      } else {
        const stored = localStorage.getItem('majo_accounts');
        const accounts = stored ? JSON.parse(stored) : [];
        accounts.push(newAccount);
        localStorage.setItem('majo_accounts', JSON.stringify(accounts));
      }

      setIsLoading(false);
      setSuccessAccount(newAccount);
      if (onRegisterSuccess) {
        onRegisterSuccess(newAccount);
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMsg(error instanceof Error ? error.message : 'Registrasi gagal. Silakan coba lagi.');
    }
  };

  return (
    <div id="register-container" className="min-h-screen w-full flex flex-col lg:flex-row bg-[#faf9fb]">
      {/* LEFT COLUMN: Brand Identity, Purpose & Role Explanation */}
      <div className="lg:w-1/2 w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100/70 border-r border-slate-200/80 p-8 lg:p-14 xl:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200/35 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-100/40 rounded-full blur-2xl pointer-events-none"></div>

        {/* Top Header / Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center p-1.5 border border-slate-200">
              <img
                src={LOGO_URL}
                alt="MAJO Logo"
                className="w-full h-full object-contain drop-shadow-xs"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-[#0c1b33]">MAJO</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Halaman Registrasi Pengguna &amp; Administrator
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-slate-200 text-xs font-semibold text-slate-600 shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Registrasi Akses Portal Mandiri
            </span>
            <h1 className="text-2xl xl:text-3xl font-extrabold text-[#0c1b33] tracking-tight leading-snug mb-3">
              Daftar Akun Baru MAJO Portal
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sistem terintegrasi untuk pemantauan preventif maintenance dan operasional cabang
              secara realtime, transparan, dan terenkripsi tanpa ketergantungan akun pihak ketiga.
            </p>
          </div>
        </div>

        {/* Middle: Dual Role Cards & Workflow Comparison */}
        <div className="my-8 relative z-10 space-y-3.5 max-w-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            PILIHAN PERAN &amp; HAK AKSES AKUN:
          </div>

          {/* Role Card: Admin */}
          <div
            id="role-info-admin"
            onClick={() => handleRoleChange('admin')}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 ${
              role === 'admin'
                ? 'bg-white/90 backdrop-blur border-2 border-blue-400 shadow-sm ring-2 ring-blue-500/10'
                : 'bg-white/70 backdrop-blur border border-slate-200 shadow-xs opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  role === 'admin'
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#0c1b33]">
                    Peran: Administrator Perusahaan
                  </h4>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Buat Portal Baru
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Membuat domain portal baru (
                  <span className="font-mono text-blue-600 font-semibold">
                    nama-kantor.majo.id
                  </span>
                  ), mengatur skema wilayah operasional, membuat job assignment (PM), dan mengelola
                  persetujuan akun staf.
                </p>
              </div>
            </div>
          </div>

          {/* Role Card: User / Petugas Lapangan */}
          <div
            id="role-info-user"
            onClick={() => handleRoleChange('user')}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 ${
              role === 'user'
                ? 'bg-white/90 backdrop-blur border-2 border-blue-400 shadow-sm ring-2 ring-blue-500/10'
                : 'bg-white/70 backdrop-blur border border-slate-200 shadow-xs opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  role === 'user'
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">person</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#0c1b33]">
                    Peran: Petugas Lapangan / User Cabang
                  </h4>
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Gabung ke Portal
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Bergabung ke portal yang sudah dibuat oleh Admin dengan memasukkan tautan/alamat
                  portal perusahaan, memilih wilayah tugas tunggal, dan menerima penugasan pekerjaan PM.
                </p>
              </div>
            </div>
          </div>

          {/* Security Note badge */}
          <div className="pt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">lock</span>
            <span>Data kredensial internal dijamin aman tanpa email publik &amp; tanpa SMS OTP.</span>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="relative z-10 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>VERSI ENTERPRISE 1.1</span>
          </div>
          <div>
            <span>© Hak Cipta MAJO Portal. Seluruh Hak Dilindungi.</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Registration Form with Workflow Validation */}
      <div className="lg:w-1/2 w-full bg-white p-8 lg:p-14 xl:p-16 flex flex-col justify-center items-center overflow-y-auto">
        <div className="w-full max-w-md my-auto py-6">
          {/* Header of form */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-blue-50/70 border border-blue-100/80 mb-3 shadow-xs">
              <img
                src={LOGO_URL}
                alt="MAJO Logo"
                className="h-10 w-10 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h2 className="text-2xl font-extrabold text-[#0c1b33] tracking-tight">
              {role === 'admin' ? 'Registrasi Admin Portal' : 'Registrasi User Teknisi'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {role === 'admin'
                ? 'Buat portal baru dan konfigurasikan lokasi kerja perusahaan Anda'
                : 'Masukkan tautan portal resmi admin dan pilih wilayah penugasan Anda'}
            </p>
          </div>

          {/* Role Selector Switcher (User / Admin) */}
          <div className="p-1 bg-slate-100/90 rounded-full border border-slate-200 flex items-center mb-5">
            <button
              type="button"
              id="btn-role-user"
              onClick={() => handleRoleChange('user')}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                role === 'user'
                  ? 'bg-white text-[#0c1b33] shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              User
            </button>
            <button
              type="button"
              id="btn-role-admin"
              onClick={() => handleRoleChange('admin')}
              className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                role === 'admin'
                  ? 'bg-white text-[#0c1b33] shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-blue-600">
                verified_user
              </span>
              Admin
            </button>
          </div>

          {successAccount ? (
            /* Registration Success Feedback State */
            <div id="register-success-card" className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm text-center animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-[26px]">check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-[#0c1b33]">Pendaftaran Berhasil!</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Akun dengan username <strong className="text-slate-800">@{successAccount.username}</strong> ({successAccount.role === 'admin' ? 'Administrator' : 'Petugas Lapangan'}) siap digunakan.
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-left text-slate-600 space-y-1.5 mb-5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Portal:</span>
                  <span className="font-mono font-medium text-blue-600">{successAccount.portalAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nama:</span>
                  <span className="font-medium text-slate-800">{successAccount.name}</span>
                </div>
                {successAccount.location && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wilayah Tugas:</span>
                    <span className="font-semibold text-emerald-700">{successAccount.location}</span>
                  </div>
                )}
              </div>
              <button
                id="login-now-btn"
                type="button"
                onClick={() => {
                  if (successAccount.role === 'admin') {
                    onNavigate('admin_dashboard');
                  } else {
                    onNavigate('user_dashboard');
                  }
                }}
                className="w-full py-3 px-6 rounded-full bg-[#0c1b33] text-white font-bold text-sm hover:bg-[#13284c] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>
                  {successAccount.role === 'admin'
                    ? 'Masuk ke Dashboard Admin (Setup Lokasi)'
                    : 'Buka Dashboard Penugasan Jobs'}
                </span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {errorMsg && (
                <div id="register-error-alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. PORTAL ADDRESS FIELD (Dinamis: CREATE vs INPUT dengan Validasi Sistem) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    id="portal-field-label"
                    htmlFor="reg-portal"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    {role === 'admin' ? 'CREATE PORTAL ADDRESS' : 'INPUT PORTAL ADDRESS'}
                  </label>
                  <span
                    id="portal-field-badge"
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      role === 'admin'
                        ? 'text-blue-600 bg-blue-50'
                        : isPortalValid
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-amber-700 bg-amber-50'
                    }`}
                  >
                    {role === 'admin'
                      ? 'Khusus Admin'
                      : isPortalValid
                      ? '✓ Terverifikasi di Sistem'
                      : 'Memerlukan Link Admin'}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">
                      {role === 'admin' ? 'domain' : 'link'}
                    </span>
                  </span>
                  <input
                    type="text"
                    id="reg-portal"
                    value={portalAddress}
                    onChange={(e) => setPortalAddress(e.target.value)}
                    placeholder={
                      role === 'admin'
                        ? 'Contoh: pt-majo-logistik-indo'
                        : 'portal.majo.id/org/pt-majo-logistik-indo'
                    }
                    required
                    className={`w-full pl-11 pr-4 py-2.5 bg-[#f8fafc] border rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-2xs ${
                      role === 'user' && !isPortalValid && portalAddress.trim().length > 0
                        ? 'border-rose-400 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                </div>
                {role === 'user' && !isPortalValid && portalAddress.trim().length > 0 && (
                  <p className="text-[11px] text-rose-600 mt-1 pl-3 font-medium">
                    ⚠️ Link Portal tidak terdaftar di sistem Admin. Pendaftaran diblokir sampai link valid.
                  </p>
                )}
                {role === 'user' && isPortalValid && (
                  <p className="text-[11px] text-emerald-600 mt-1 pl-3 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Link Portal valid dan terdaftar. Anda dapat melanjutkan pendaftaran.
                  </p>
                )}
                {role === 'admin' && (
                  <p className="text-[11px] text-slate-400 mt-1 pl-3">
                    Sistem akan selalu menambahkan akhiran <span className="font-semibold">.majo.id</span> pada alamat portal.
                  </p>
                )}
              </div>

              {/* 2. CHOOSE LOCATION (Khusus User: Single Wilayah Only, No Groups) */}
              {role === 'user' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="reg-location"
                      className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      CHOOSE LOCATION (WILAYAH KERJA)
                    </label>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Opsi Tunggal (Bukan Grup)
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 pointer-events-none">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                    </span>
                    <select
                      id="reg-location"
                      value={selectedLocation}
                      disabled={!isPortalValid}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full pl-11 pr-10 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-full text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-2xs appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {availableLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-4 text-slate-400 pointer-events-none">
                      <span className="material-symbols-outlined text-[18px]">expand_more</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-3">
                    Diambil langsung dari data master wilayah yang didaftarkan oleh Admin.
                  </p>
                </div>
              )}

              {/* 3. NAME FIELD */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reg-name"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    NAMA LENGKAP
                  </label>
                  <span className="text-[10px] font-semibold text-rose-500">Wajib Diisi</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </span>
                  <input
                    type="text"
                    id="reg-name"
                    value={name}
                    disabled={role === 'user' && !isPortalValid}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'admin' ? 'Contoh: Super Admin' : 'Contoh: Agus Setiawan, S.T.'}
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-2xs disabled:opacity-50"
                  />
                </div>
              </div>

              {(role === 'admin' || isFirebaseConfigured) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="reg-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {role === 'admin' ? 'ALAMAT EMAIL ADMIN' : 'ALAMAT EMAIL AKUN'}
                    </label>
                    <span className="text-[10px] font-semibold text-rose-500">Wajib Diisi</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </span>
                    <input
                      type="email"
                      id="reg-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@perusahaan.com"
                      required
                      className="w-full pl-11 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-3">
                    Email ini digunakan untuk pemulihan password admin.
                  </p>
                </div>
              )}

              {/* 4. USERNAME FIELD */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reg-username"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    USERNAME
                  </label>
                  <span className="text-[10px] font-semibold text-rose-500">Wajib Diisi</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 font-semibold text-sm">@</span>
                  <input
                    type="text"
                    id="reg-username"
                    value={username}
                    disabled={role === 'user' && !isPortalValid}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === 'admin' ? 'admin_pusat' : 'teknisi_medan'}
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-2xs disabled:opacity-50"
                  />
                </div>
              </div>

              {/* 5. PASSWORD FIELD */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reg-password"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    PASSWORD
                  </label>
                  <span className="text-[10px] font-semibold text-rose-500">Wajib Diisi</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="reg-password"
                    value={password}
                    disabled={role === 'user' && !isPortalValid}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    required
                    className="w-full pl-11 pr-11 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-2xs disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 6. DOUBLE VERIFICATION PASSWORD (Konfirmasi Password) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reg-confirm-password"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    KONFIRMASI PASSWORD
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500">Double Verifikasi</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="reg-confirm-password"
                    value={confirmPassword}
                    disabled={role === 'user' && !isPortalValid}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi yang sama"
                    required
                    className={`w-full pl-11 pr-11 py-2.5 bg-[#f8fafc] border rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-2xs disabled:opacity-50 ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-400 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1 pl-3 font-medium">
                    Kata sandi belum sama. Pastikan pengetikan identik.
                  </p>
                )}
              </div>

              {/* Submit Button (Done) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || (role === 'user' && !isPortalValid)}
                  className="w-full py-3.5 px-6 rounded-full bg-[#0c1b33] hover:bg-[#13284c] text-white font-bold text-sm tracking-wide transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Mendaftarkan Akun...</span>
                    </>
                  ) : (
                    <>
                      <span id="btn-submit-label">Done</span>
                      <span className="material-symbols-outlined text-[18px] transform group-hover:translate-x-0.5 transition-transform">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Login Navigation Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="font-bold text-[#0c1b33] hover:text-blue-600 transition-colors ml-1 cursor-pointer"
                  >
                    Masuk
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
