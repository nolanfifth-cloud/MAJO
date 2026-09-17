import React, { useState } from 'react';
import {
  CheckCircle2,
  Server,
  MapPin,
  Layers,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
} from 'lucide-react';

export interface ProfilTeknisiViewProps {
  displayName?: string;
  displayUsername?: string;
  userInitials?: string;
  onTriggerToast: (msg: string) => void;
  onOpenLogoutModal: () => void;
}

export const ProfilTeknisiView: React.FC<ProfilTeknisiViewProps> = ({
  displayName = 'Agus Setiawan, S.T.',
  displayUsername = 'user1',
  userInitials = 'U1',
  onTriggerToast,
  onOpenLogoutModal,
}) => {
  // Password Form States
  const [currPassword, setCurrPassword] = useState('••••••••••••');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Copy Portal State
  const [copied, setCopied] = useState(false);

  const handleCopyPortal = () => {
    const portalUrl = 'portal.majo.id/org/pt-majo-logistik-indo';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(portalUrl).catch(() => {});
    }
    setCopied(true);
    onTriggerToast('Portal address berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      onTriggerToast('Silakan masukkan kata sandi baru.');
      return;
    }
    if (newPassword.length < 8) {
      onTriggerToast('Kata sandi baru minimal 8 karakter unik.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onTriggerToast('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    onTriggerToast('Kata sandi berhasil diperbarui dengan aman!');
    setCurrPassword('••••••••••••');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0C1B33] tracking-tight">
            Profil &amp; Identitas Teknisi Lapangan
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Informasi data pegawai resmi, akun terdaftar, lokasi kerja, dan pengaturan keamanan akun.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Akun Aktif &amp; Terverifikasi SSO</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 7 cols, Right 5 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Profile Card Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0C1B33] text-white flex items-center justify-center font-extrabold text-2xl shadow-sm border border-slate-700 shrink-0">
                  {userInitials}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-extrabold text-[#0C1B33]">{displayName}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Aktif
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    @{displayUsername} • Field Maintenance Engineer
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTriggerToast('Informasi profil disinkronisasi dengan server HR')}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center space-x-1.5 shadow-sm self-start sm:self-center cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sinkron Data</span>
              </button>
            </div>

            {/* Profile Card Details */}
            <div className="p-6 space-y-5">
              {/* Box Identitas Kerja & Pegawai Resmi */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#0C1B33] text-white flex items-center justify-center shrink-0 text-sm mt-0.5">
                  <Server className="w-4 h-4 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Identitas Kerja &amp; Pegawai Resmi
                  </div>
                  <div className="text-sm font-bold text-[#0C1B33] mt-0.5 break-words">
                    Unit TI / Medan – Hub Operasional
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Ditetapkan resmi di bawah Divisi Operasional Jaringan &amp; Infrastruktur Gardu.
                  </p>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-4 text-xs">
                {/* Row 1: Lokasi Kerja Resmi */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3.5 border-b border-slate-100">
                  <div className="text-slate-500 font-medium flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <span>Lokasi Kerja Resmi</span>
                  </div>
                  <div className="sm:col-span-2 font-semibold text-slate-800">
                    Medan – Hub Operasional &amp; Gardu Induk SOR 1
                  </div>
                </div>

                {/* Row 2: Portal Address Terdaftar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3.5 border-b border-slate-100">
                  <div className="text-slate-500 font-medium flex items-center">
                    <Layers className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <span>Portal Address Terdaftar</span>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <span className="font-mono font-medium text-blue-600 truncate max-w-[280px]">
                      portal.majo.id/org/pt-majo-logistik-indo
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPortal}
                      className="text-blue-600 hover:underline font-bold text-xs flex items-center space-x-1 ml-2 shrink-0 cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                {/* Row 3: Kapan Akun Dibuat */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3.5 border-b border-slate-100">
                  <div className="text-slate-500 font-medium flex items-center">
                    <Clock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <span>Kapan Akun Dibuat</span>
                  </div>
                  <div className="sm:col-span-2 font-medium text-slate-700 flex flex-wrap items-center gap-1.5">
                    <span>12 Januari 2025, 08:30 WIB</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      Aktif 1 Tahun 8 Bulan
                    </span>
                  </div>
                </div>

                {/* Row 4: Tingkat Otoritas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="text-slate-500 font-medium flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <span>Tingkat Otoritas</span>
                  </div>
                  <div className="sm:col-span-2 font-semibold text-slate-800 flex items-center space-x-2">
                    <span>Teknisi Pelaksana Mandiri</span>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600 font-mono font-bold">
                      LEVEL-3 FIELD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Ganti Kata Sandi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-sm font-bold text-[#0C1B33]">Ganti Kata Sandi</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Perbarui kata sandi secara berkala untuk menjaga keamanan akun operasional Anda.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              {/* Kata Sandi Saat Ini */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showCurrPass ? 'text' : 'password'}
                    value={currPassword}
                    onChange={(e) => setCurrPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrPass(!showCurrPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrPass ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Kata Sandi Baru */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter unik"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Kata Sandi Baru */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPass ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#0C1B33] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Password</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card: Manajemen Penyimpanan & Sesi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Server className="w-4 h-4 text-[#0C1B33] shrink-0" />
              <h3 className="text-sm font-bold text-[#0C1B33]">Manajemen Penyimpanan &amp; Sesi</h3>
            </div>

            <div className="space-y-3">
              {/* Item 1: Bersihkan Cache */}
              <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800">Bersihkan Penyimpanan Lokal</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    File foto &amp; bukti checklist yang sudah diunggah tetap aman tersimpan di cloud server MAJO.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTriggerToast('Cache lokal 32.4 MB berhasil dibersihkan!')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition whitespace-nowrap shadow-2xs shrink-0 cursor-pointer"
                >
                  Bersihkan Cache
                </button>
              </div>

              {/* Item 2: Sesi Login Aktif */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Sesi Login Aktif</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="text-xs font-medium text-slate-600">
                  Desktop Web Browser - Chrome
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  (Sesi Ini - Aktif Sekarang di Medan Hub)
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onOpenLogoutModal}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 hover:border-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Keluar dari Akun (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
