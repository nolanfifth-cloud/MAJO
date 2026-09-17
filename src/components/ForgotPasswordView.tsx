import React, { useState } from 'react';
import { AuthView } from '../types';
import { isFirebaseConfigured, sendFirebasePasswordReset } from '../services/firebase';

const LOGO_URL = '/assets/logo%20MAJO.png';

interface ForgotPasswordViewProps {
  onNavigate: (view: AuthView) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Harap masukkan username akun MAJO Anda.');
      return;
    }

    if (isFirebaseConfigured) {
      if (!email.trim()) {
        setErrorMessage('Masukkan email admin terdaftar untuk menerima tautan reset password.');
        return;
      }
      setIsLoading(true);
      try {
        await sendFirebasePasswordReset(email);
        setTicketId('RESET-FIREBASE');
        setIsSubmitted(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Email reset password gagal dikirim.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setErrorMessage('Firebase belum dikonfigurasi. Hubungkan Firebase Authentication untuk mengirim email reset password.');
  };

  const handleResetFormState = () => {
    setUsername('');
    setEmail('');
    setEmployeeId('');
    setNotes('');
    setIsSubmitted(false);
  };

  return (
    <div id="forgot-password-container" className="flex flex-col w-full min-h-screen">
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen bg-surface">
        {/* Left Column: Branding, Guidelines, & Recovery Protocol */}
        <aside className="lg:col-span-5 xl:col-span-5 bg-surface-container-low flex flex-col justify-between p-8 sm:p-12 lg:p-14 relative overflow-hidden shadow-sm">
          {/* Ambient Background Aura */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Branding Section */}
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface shadow-xs flex items-center justify-center p-1.5 border border-outline-variant/30">
                <img
                  alt="MAJO Logo"
                  className="w-full h-full object-contain"
                  src={LOGO_URL}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-on-surface">MAJO</span>
                </div>
                <p className="text-xs text-secondary font-medium">Portal Akses &amp; Bantuan Sistem</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h1 className="text-2xl font-bold text-on-surface tracking-tight leading-snug">
                Pusat Bantuan &amp; Keamanan Akun MAJO
              </h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Karena sistem MAJO beroperasi secara internal tanpa email publik/pihak ketiga,
                pemulihan akun dilakukan langsung melalui verifikasi Administrator Resmi untuk
                menjamin keabsahan data kerja.
              </p>
            </div>

            {/* Protocol Steps / Information Cards */}
            <div className="space-y-4 pt-4">
              <div className="p-5 rounded-2xl bg-surface shadow-sm transition-all duration-200 hover:shadow-md flex items-start gap-4 border border-outline-variant/20">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 text-on-primary-fixed">
                  <span className="material-symbols-outlined text-[20px]">assignment_ind</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-primary uppercase font-bold tracking-wider">
                      Langkah 01
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      Pengajuan Kredensial
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Kirim username dan identitas kerja resmi Anda melalui formulir terenkripsi di
                    samping.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface shadow-sm transition-all duration-200 hover:shadow-md flex items-start gap-4 border border-outline-variant/20">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-on-secondary-container">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-primary uppercase font-bold tracking-wider">
                      Langkah 02
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      Verifikasi Mandiri Admin
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Administrator portal akan memvalidasi kecocokan data staf, NIP, serta unit
                    penempatan aktif.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface shadow-sm transition-all duration-200 hover:shadow-md flex items-start gap-4 border border-outline-variant/20">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0 text-on-tertiary-fixed">
                  <span className="material-symbols-outlined text-[20px]">key</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-tertiary uppercase font-bold tracking-wider">
                      Langkah 03
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      Pemberian Kredensial Baru
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Kata sandi sementara akan diserahkan secara aman melalui kontak operasional atau
                    unit divisi Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance Footer */}
          <div className="relative z-10 pt-10 mt-8 space-y-3">
            <div className="flex items-center gap-2.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-tertiary">shield_lock</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Protokol Keamanan MAJO
              </span>
            </div>
            <p className="text-xs text-secondary leading-normal">
              Seluruh data transmisi dilindungi enkripsi SHA-256 internal. © 2025 MAJO Portal. Hak
              Cipta Dilindungi Undang-Undang.
            </p>
          </div>
        </aside>

        {/* Right Column: Interactive Reset Request Form */}
        <main className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 xl:p-20 relative bg-surface">
          <div className="w-full max-w-xl mx-auto flex flex-col">
            {/* Header & Status Indicator */}
            <div className="space-y-3 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Bantuan Kredensial Portal
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                Lupa Kata Sandi?
              </h2>
              <p className="text-base text-on-surface-variant">
                Kirim permintaan reset langsung ke Administrator sistem untuk mendapatkan akses akun
                kembali.
              </p>
            </div>

            {/* Dynamic Success Feedback State */}
            {isSubmitted ? (
              <div
                id="successNotice"
                className="p-6 sm:p-8 rounded-2xl bg-surface-container-high border border-outline-variant/30 shadow-lg space-y-4 animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-on-surface">
                      Link Reset Password Terkirim
                    </p>
                    <p className="text-xs text-secondary">
                      Tiket antrean ID:{' '}
                      <span className="font-mono font-bold text-on-surface text-sm">
                        {ticketId}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Tautan untuk mengganti password akun <strong className="text-on-surface">@{username}</strong> telah
                  dikirim ke <strong className="text-on-surface">{email}</strong>. Buka Gmail tersebut dan ikuti
                  instruksi Firebase untuk membuat password baru.
                </p>
                <div className="pt-3 flex flex-col sm:flex-row gap-3">
                  <button
                    className="h-11 px-5 rounded-full bg-surface text-on-surface text-sm font-semibold shadow-sm hover:bg-surface-container transition-colors cursor-pointer border border-outline-variant/30"
                    onClick={handleResetFormState}
                    type="button"
                  >
                    Ajukan Permintaan Lain
                  </button>
                  <button
                    className="h-11 px-6 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-sm hover:bg-primary-container transition-colors cursor-pointer"
                    onClick={() => onNavigate('login')}
                    type="button"
                  >
                    Kembali ke Halaman Masuk
                  </button>
                </div>
              </div>
            ) : (
              /* Form Elements */
              <form
                id="resetRequestForm"
                onSubmit={handleFormSubmit}
                className="space-y-6"
              >
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-error-container/50 border border-error/20 text-error text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Username Field */}
                <div className="space-y-2">
                  <label
                    className="flex items-center justify-between text-xs font-bold text-on-surface uppercase tracking-wider"
                    htmlFor="usernameInput"
                  >
                      <span>Username Akun Admin</span>
                    <span className="text-[10px] text-error font-semibold">Wajib Diisi</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-on-surface-variant flex items-center justify-center pointer-events-none">
                      <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                    </span>
                    <input
                      className="w-full h-14 pl-12 pr-4 bg-surface-container-low rounded-2xl text-on-surface text-base placeholder:text-outline transition-all duration-200 focus:bg-surface focus:shadow-md outline-none border border-transparent focus:border-outline-variant/30"
                      id="usernameInput"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username akun MAJO Anda"
                      required
                      type="text"
                    />
                  </div>
                  <p className="text-xs text-secondary">
                    Username terdaftar yang biasa digunakan untuk login sistem operasional.
                  </p>
                </div>

                {/* Admin self-service recovery fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="emailInput">
                      Email Admin Terdaftar
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      Khusus admin
                    </span>
                  </div>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-low rounded-2xl text-on-surface text-base placeholder:text-outline outline-none border border-transparent focus:border-outline-variant/30"
                    id="emailInput"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Gmail admin terdaftar"
                    required
                    type="email"
                  />
                  <p className="text-xs text-secondary">
                    Tautan untuk mengganti password akan dikirim ke Gmail ini.
                  </p>
                </div>

                {/* Additional Identity Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="idInput">
                      Identitas Kerja / Pegawai
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-semibold">
                      Disarankan
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-on-surface-variant flex items-center justify-center pointer-events-none">
                      <span className="material-symbols-outlined text-[20px]">badge</span>
                    </span>
                    <input
                      className="w-full h-14 pl-12 pr-4 bg-surface-container-low rounded-2xl text-on-surface text-base placeholder:text-outline transition-all duration-200 focus:bg-surface focus:shadow-md outline-none border border-transparent focus:border-outline-variant/30"
                      id="idInput"
                      name="employeeId"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Contoh: Unit TI / Cabang Surabaya"
                      type="text"
                    />
                  </div>
                  <p className="text-xs text-secondary">
                    Membantu Administrator mempercepat pencarian direktori staf &amp; validasi identitas.
                  </p>
                </div>

                {/* Additional Note Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wider" htmlFor="notesInput">
                      Pesan / Catatan Tambahan
                    </label>
                    <span className="text-[10px] font-semibold text-secondary">Opsional</span>
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full p-4 bg-surface-container-low rounded-2xl text-on-surface text-sm placeholder:text-outline resize-none transition-all duration-200 focus:bg-surface focus:shadow-md outline-none border border-transparent focus:border-outline-variant/30"
                      id="notesInput"
                      name="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Jelaskan kendala (misal: ganti perangkat kantor, lupa kombinasi pin, atau nomor telepon aktif untuk konfirmasi)..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Informational Callout Banner */}
                <div className="p-4 rounded-2xl bg-primary-fixed/40 flex items-start gap-3.5 shadow-sm border border-primary-fixed">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-on-primary-fixed">
                      Konfirmasi Penyerahan Kredensial
                    </p>
                    <p className="text-xs text-on-primary-fixed-variant leading-relaxed">
                      Admin MAJO akan memverifikasi permohonan Anda dan menghubungi melalui kontak
                      terdaftar atau saluran internal untuk penyerahan kata sandi sementara yang aman.
                    </p>
                  </div>
                </div>

                {/* Submit CTA Button */}
                <button
                  className="w-full h-14 rounded-full bg-primary text-on-primary text-base font-semibold flex items-center justify-center gap-3 shadow-md hover:bg-primary-container active:scale-[0.99] transition-all duration-150 cursor-pointer disabled:opacity-80"
                  id="submitBtn"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin mr-2"></span>
                      <span>Memproses Tiket...</span>
                    </>
                  ) : (
                    <>
                      <span>Minta Reset ke Admin</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>

                {/* Return to Sign In Link */}
                <div className="flex items-center justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-on-primary-fixed-variant transition-colors group p-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:-translate-x-1">
                      arrow_back
                    </span>
                    <span>
                      Sudah ingat kata sandi? <strong className="font-bold">Masuk</strong>
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
