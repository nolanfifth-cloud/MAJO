import React, { useState } from 'react';

interface ProfileSettingsViewProps {
  onNavigateToDashboard: () => void;
  onNavigateToCreateJobs?: () => void;
  onNavigateToLinkPortal?: () => void;
  onLogout: () => void;
  currentUser?: {
    username: string;
    name: string;
    role: string;
    email?: string;
  };
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  onNavigateToDashboard,
  onLogout,
  currentUser = { username: '', name: '', role: 'admin' },
}) => {
  // Password Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Double Verification Clear Storage Modal States
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [agreeUnderstandCache, setAgreeUnderstandCache] = useState(false);
  const [agreeConfirmNoUnsaved, setAgreeConfirmNoUnsaved] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // Logout Confirmation Modal States
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    isSuccess: boolean;
  }>({
    show: false,
    title: '',
    message: '',
    isSuccess: true,
  });

  const triggerToast = (title: string, message: string, isSuccess = true) => {
    setToast({ show: true, title, message, isSuccess });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Handle Password Change Form
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!oldPassword.trim()) {
      setPasswordError('Silakan masukkan kata sandi saat ini.');
      triggerToast('Validasi Gagal', 'Kata sandi saat ini tidak boleh kosong.', false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Kata sandi baru minimal 8 karakter.');
      triggerToast('Validasi Gagal', 'Kata sandi baru minimal 8 karakter kombinasi.', false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      triggerToast('Validasi Gagal', 'Konfirmasi kata sandi baru tidak sesuai.', false);
      return;
    }

    setPasswordError('Perubahan kata sandi belum terhubung ke Firebase Authentication.');
    triggerToast('Belum tersedia', 'Kata sandi belum diubah karena integrasi Firebase belum dijalankan.', false);
  };

  // Handle Double Verification Local Storage Cleanup
  const handleExecuteCleanStorage = () => {
    setIsCleaning(true);
    setTimeout(() => {
      // Clear temporary items in sessionStorage or localStorage safe cache keys
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('cache') || key.includes('temp') || key.includes('draft'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err) {
        console.error('Storage clear err:', err);
      }

      setIsCleaning(false);
      setIsCleanModalOpen(false);
      setAgreeUnderstandCache(false);
      setAgreeConfirmNoUnsaved(false);
      triggerToast(
        'Cache Dibersihkan',
        'Penyimpanan lokal sementara telah disegarkan. File cloud tetap aman.',
        true
      );
    }, 450);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] text-slate-900 pb-20">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 transform transition-all duration-300 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              toast.isSuccess
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {toast.isSuccess ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
          <div>
            <h5 className="text-xs font-bold">{toast.title}</h5>
            <p className="text-[11px] text-slate-300">{toast.message}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DOUBLE VERIFICATION BERSIHKAN PENYIMPANAN LOKAL */}
      {/* ========================================================================= */}
      {isCleanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                    Verifikasi Ganda
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Bersihkan Penyimpanan Lokal Browser?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tindakan ini akan mengosongkan berkas pratinjau cache sementara, cookies penugasan offline, dan
                  draft lokal pada peramban ini.
                </p>
              </div>
            </div>

            {/* Cloud Safe Box Notice */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
              <div className="text-xs text-blue-900">
                <span className="font-bold block">Sinkronisasi Cloud Tetap Aman</span>
                <p className="text-blue-800/80 mt-0.5 leading-normal">
                  Pekerjaan PM, master data, dan foto checklist yang telah tersinkronisasi ke server Enclave MAJO tidak
                  akan terhapus.
                </p>
              </div>
            </div>

            {/* Double Verification Checkboxes */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Konfirmasi Syarat Pembersihan (Centang Kedua Opsi):
              </span>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeUnderstandCache}
                  onChange={(e) => setAgreeUnderstandCache(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer mt-0.5 accent-blue-600"
                />
                <span className="text-xs text-slate-700 font-medium leading-snug">
                  1. Saya memahami cache data offline dan pratinjau lokal peramban akan dihapus secara menyeluruh.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeConfirmNoUnsaved}
                  onChange={(e) => setAgreeConfirmNoUnsaved(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer mt-0.5 accent-blue-600"
                />
                <span className="text-xs text-slate-700 font-medium leading-snug">
                  2. Saya telah memastikan tidak ada draf penugasan aktif yang belum disimpan atau sedang diproses.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCleanModalOpen(false);
                  setAgreeUnderstandCache(false);
                  setAgreeConfirmNoUnsaved(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!agreeUnderstandCache || !agreeConfirmNoUnsaved || isCleaning}
                onClick={handleExecuteCleanStorage}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                  agreeUnderstandCache && agreeConfirmNoUnsaved && !isCleaning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isCleaning ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Konfirmasi &amp; Bersihkan Cache</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DOUBLE CONFIRMATION LOGOUT */}
      {/* ========================================================================= */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Konfirmasi Keluar Akun</h3>
            <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin keluar dari sesi admin MAJO? Anda dapat masuk kembali kapan saja dengan
              username dan kata sandi Anda.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  triggerToast('Sesi Berakhir', 'Anda telah keluar dari akun. Mengalihkan ke login...', true);
                  setTimeout(() => {
                    onLogout();
                  }, 400);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="p-8 max-w-7xl mx-auto w-full">
        {/* Breadcrumbs & Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="hover:text-slate-600 transition-colors uppercase cursor-pointer"
              >
                PORTAL ADMIN
              </button>
              <span>/</span>
              <span className="text-blue-600 uppercase">PENGATURAN &amp; PROFIL</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Pengaturan &amp; Profil Pengguna
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola informasi pribadi, keamanan akun, integritas penyimpanan cache offline, dan sesi akses.
            </p>
          </div>
        </div>

        {/* MAIN 2-COLUMN GRID (7 Cols / 5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ===================================================================== */}
          {/* LEFT COLUMN: Profil & Data Detail (7 Cols) */}
          {/* ===================================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* KARTU 1: INFORMASI PRIBADI AKUN */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Informasi Pribadi</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Rincian identitas dan unit kerja akun yang aktif saat ini
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                  Mode Read-Only
                </span>
              </div>

              <div className="p-8 space-y-6">
                {/* Nama Lengkap */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nama Lengkap
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {currentUser.name || 'Belum login'}
                    </p>
                    <span className="text-xs text-slate-500">Akun Administrator Utama Sistem</span>
                  </div>
                </div>

                {/* Lokasi Penempatan */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100/60 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Lokasi Penempatan
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                        Master
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-900 mt-0.5">Kantor Pusat Operasional</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Master Hub Regional &amp; Pusat Kendali Seluruh Wilayah
                    </p>
                  </div>
                </div>

                {/* Username & Portal Address ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div className="p-5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Username Akun
                    </span>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <span className="text-slate-400">@</span>
                      <span>{currentUser.username || 'Belum login'}</span>
                    </div>
                  </div>
                  <div className="p-5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Portal Address ID
                    </span>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 font-mono">
                      <span className="text-blue-600">portal.majo.id/</span>
                      <span>admin-center</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KARTU 2: BERSIHKAN PENYIMPANAN LOKAL (Dengan Double Verification) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Bersihkan Penyimpanan Lokal</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                      Hapus cache data offline, draft formulir lokal, dan file pratinjau sementara pada browser ini
                      untuk menyegarkan memori kerja portal dan meningkatkan performa sistem.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCleanModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                >
                  Bersihkan
                </button>
              </div>

              {/* Cloud Synchronization Safe Banner */}
              <div className="mt-6 p-5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3.5">
                <svg className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
                <div>
                  <span className="text-sm font-bold text-blue-900 block">
                    Aman &amp; Terproteksi: Cloud Synchronization
                  </span>
                  <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                    File foto yang sudah di-insert pada jobs serta riwayat checklist PM tetap tersimpan rapi dan aman
                    di server cloud MAJO, tidak akan terhapus saat cache lokal dibersihkan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT COLUMN: Ganti Password & Logout (5 Cols) */}
          {/* ===================================================================== */}
          <div className="lg:col-span-5 space-y-6">
            {/* KARTU 3: GANTI PASSWORD FORM */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ganti Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ubah kata sandi akun secara berkala untuk menjaga keamanan
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-8 space-y-5">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Kata Sandi Saat Ini */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Kata Sandi Saat Ini</label>
                  <div className="relative">
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      placeholder="Masukkan kata sandi lama"
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showOldPass ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                          />
                        ) : (
                          <>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Kata Sandi Baru */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Minimal 8 karakter kombinasi"
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showNewPass ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                          />
                        ) : (
                          <>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Kata Sandi Baru */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Ulangi kata sandi baru"
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showConfirmPass ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                          />
                        ) : (
                          <>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Simpan Perubahan Password</span>
                  </button>
                </div>
              </form>
            </div>

            {/* KARTU 4: SESI & LOGOUT PANEL */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sesi Login Aktif
                  </h4>
                  <p className="text-base font-bold text-slate-800 mt-1">
                    Sesi Browser • {navigator.userAgent.includes('Edg') ? 'Microsoft Edge' : navigator.userAgent.includes('Chrome') ? 'Google Chrome' : navigator.userAgent.includes('Firefox') ? 'Mozilla Firefox' : 'Browser lain'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sesi aktif pada perangkat ini
                  </p>
                </div>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
              </div>

              <div className="pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
