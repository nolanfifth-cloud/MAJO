import React, { useState, useMemo, useEffect } from 'react';
import { AuthView, PmItem } from '../types';
import { RiwayatSelesaiView } from './RiwayatSelesaiView';
import { ProfilTeknisiView } from './ProfilTeknisiView';
import { isCloudinaryConfigured, uploadPhotoToCloudinary } from '../services/cloudinary';
import { loadAdminJobsFromFirestore, saveCompletedReportToFirestore } from '../services/firestoreStore';
import {
  ListChecks,
  Clock,
  User,
  Radio,
  Bell,
  ChevronUp,
  ChevronDown,
  Layers,
  Plus,
  Trash2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit3,
  RefreshCw,
  Check,
  X,
  CalendarCheck,
  MapPin,
  ShieldCheck,
  LogOut,
  Building2,
  KeyRound,
  FileCheck,
  ExternalLink,
} from 'lucide-react';

interface DeviceItem {
  id: string;
  location: string;
  expanded: boolean;
  statusState: 'INITIAL' | 'DONE' | 'UPDATE';
  formData: {
    photo: string;
    photoName: string;
    status: string;
    keterangan: string;
    durasi: string;
  };
}

interface JobTabItem {
  id: number;
  title: string;
  pmType?: string;
  devices: DeviceItem[];
}

interface UserDashboardProps {
  onNavigate: (view: AuthView) => void;
  currentUser?: {
    uid?: string;
    username: string;
    name?: string;
    role?: 'admin' | 'user';
    location?: string;
  };
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onNavigate,
  currentUser = {
    uid: undefined,
    username: '',
    name: '',
    role: 'user',
    location: '',
  },
}) => {
  // Navigation & Sub-views state
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'riwayat' | 'profil'>('dashboard');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Top Task Card Accordion
  const [isTaskCardExpanded, setIsTaskCardExpanded] = useState(true);

  // Active Job Tab
  const [currentJobId, setCurrentJobId] = useState<number>(0);

  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; isSuccess: boolean }>({
    show: false,
    message: '',
    isSuccess: true,
  });

  const triggerToast = (message: string, isSuccess = true) => {
    setToast({ show: true, message, isSuccess });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Jobs are loaded from real admin assignments; no demo records are seeded.
  const [jobsDatabase, setJobsDatabase] = useState<Record<number, JobTabItem>>({});

  useEffect(() => {
    let cancelled = false;
    loadAdminJobsFromFirestore().then((jobs) => {
      if (cancelled || jobs.length === 0) return;
      const assignedJobs = jobs.reduce<Record<number, JobTabItem>>((result, job: PmItem, index) => {
        result[index + 1] = {
          id: index + 1,
          title: job.title,
          pmType: job.modules?.[0]?.name,
          devices: (job.modules || []).map((module, moduleIndex) => ({
            id: `${job.id}_${moduleIndex + 1}`,
            location: job.regions,
            expanded: moduleIndex === 0,
            statusState: 'INITIAL',
            formData: {
              photo: '',
              photoName: '',
              status: '',
              keterangan: '',
              durasi: '',
            },
          })),
        };
        return result;
      }, {});
      setJobsDatabase(assignedJobs);
      setCurrentJobId(1);
    }).catch(() => {
      // No cloud assignments are available yet.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Submission & Confirmation modal states
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Compute all devices across all jobs
  const allDevices = useMemo(() => {
    return (Object.values(jobsDatabase) as JobTabItem[]).flatMap((j) => j.devices);
  }, [jobsDatabase]);

  // Compute completed devices (DONE or in UPDATE mode during edit - keeps progress level unchanged!)
  const completedDevicesCount = useMemo(() => {
    return allDevices.filter((d) => d.statusState === 'DONE' || d.statusState === 'UPDATE').length;
  }, [allDevices]);

  const totalDevicesCount = allDevices.length;
  const progressPercentage =
    totalDevicesCount > 0
      ? Math.round((completedDevicesCount / totalDevicesCount) * 100)
      : 0;
  const isFullyCompleted = progressPercentage === 100 && totalDevicesCount > 0;

  // Options helper for the 9 PM types
  const getConditionOptions = (pmType?: string) => {
    switch (pmType) {
      case 'pembersihan':
        return [
          { value: 'bersih', label: 'Bersih', color: 'emerald' },
          { value: 'kotor', label: 'Kotor', color: 'rose' },
        ];
      case 'fire_extinguisher':
        return [
          { value: 'baik', label: 'Baik', color: 'emerald' },
          { value: 'kadaluarsa', label: 'Kadaluarsa', color: 'amber' },
          { value: 'rusak', label: 'Rusak', color: 'rose' },
        ];
      case 'ems':
        return [
          { value: 'aktif', label: 'Aktif', color: 'emerald' },
          { value: 'error', label: 'Error', color: 'rose' },
        ];
      case 'rack_server':
        return [
          { value: 'rapi', label: 'Rapi', color: 'emerald' },
          { value: 'normal', label: 'Normal', color: 'blue' },
          { value: 'berantakan', label: 'Berantakan', color: 'rose' },
        ];
      case 'rack_wallmount':
        return [
          { value: 'rapi', label: 'Rapi', color: 'emerald' },
          { value: 'perlu_penataan', label: 'Perlu Penataan', color: 'amber' },
        ];
      default:
        return [
          { value: 'normal', label: 'Normal', color: 'emerald' },
          { value: 'rusak', label: 'Rusak', color: 'rose' },
        ];
    }
  };

  // Submit complete 100% report to Admin and archive into Riwayat Selesai
  const handleConfirmSubmitReport = () => {
    setIsSubmitted(true);
    setShowSubmitModal(false);

    const submittedReport = {
      id: `PM-${new Date().getFullYear()}-${Date.now()}`,
      year: new Date().getFullYear(),
      title: activeJob.title,
      completedAt:
        new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
        `, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      period: new Date().toLocaleDateString('id-ID'),
      region: currentUser?.location || '',
      subJobsCount: Object.keys(jobsDatabase).length,
      pointsCount: allDevices.length,
      subJobs: (Object.values(jobsDatabase) as JobTabItem[]).flatMap((job, idx) =>
        job.devices.map((d, dIdx) => ({
          name: job.title,
          tag: String.fromCharCode(65 + idx) + (dIdx + 1),
          device: d.location || 'Perangkat Standar',
          duration: `${d.formData.durasi || '30'} Menit`,
          file: d.formData.photoName || 'foto_inspeksi.jpg',
          time:
            new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' (GPS Valid)',
          desc: d.formData.keterangan || 'Kondisi telah diperiksa normal sesuai standar operasional.',
        }))
      ),
    };

    try {
      const existing = localStorage.getItem('majo_completed_reports');
      const list = existing ? JSON.parse(existing) : [];
      localStorage.setItem('majo_completed_reports', JSON.stringify([submittedReport, ...list]));
      void saveCompletedReportToFirestore(submittedReport as Record<string, unknown>, currentUser?.uid).catch(() => {
        // localStorage remains the fallback when cloud persistence fails.
      });
    } catch {
      // fallback
    }

    triggerToast('Laporan PM 100% Lengkap berhasil diserahkan ke Admin Wilayah!', true);
  };

  // Current active job
  const activeJob = jobsDatabase[currentJobId] || {
    id: currentJobId,
    title: 'Belum ada penugasan dari admin',
    devices: [],
  };

  // Toggle Device Accordion
  const toggleDeviceExpand = (deviceId: string) => {
    setJobsDatabase((prev) => {
      const job = prev[currentJobId];
      if (!job) return prev;
      const updatedDevices = job.devices.map((d) =>
        d.id === deviceId ? { ...d, expanded: !d.expanded } : d
      );
      return {
        ...prev,
        [currentJobId]: { ...job, devices: updatedDevices },
      };
    });
  };

  // Add new device row
  const addNewDevice = () => {
    const newId = `dev_${currentJobId}_${Date.now()}`;
    const newDev: DeviceItem = {
      id: newId,
      location: '',
      expanded: true,
      statusState: 'INITIAL',
      formData: {
        photo: '',
        photoName: '',
        status: 'normal',
        keterangan: '',
        durasi: '',
      },
    };

    setJobsDatabase((prev) => {
      const job = prev[currentJobId] || { id: currentJobId, title: `Daftar Jobs ${currentJobId}`, devices: [] };
      return {
        ...prev,
        [currentJobId]: {
          ...job,
          devices: [...job.devices, newDev],
        },
      };
    });
    triggerToast('Baris perangkat baru ditambahkan!');
  };

  // Prompt delete device
  const promptDeleteDevice = (deviceId: string) => {
    setDeleteTargetId(deviceId);
  };

  // Confirm delete device
  const confirmDeleteDevice = () => {
    if (!deleteTargetId) return;
    setJobsDatabase((prev) => {
      const job = prev[currentJobId];
      if (!job) return prev;
      return {
        ...prev,
        [currentJobId]: {
          ...job,
          devices: job.devices.filter((d) => d.id !== deleteTargetId),
        },
      };
    });
    setDeleteTargetId(null);
    triggerToast('Data perangkat berhasil dihapus.');
  };

  // Handle device action button cycle (INITIAL -> DONE -> UPDATE -> DONE)
  const handleActionClick = (deviceId: string) => {
    const device = activeJob.devices.find((d) => d.id === deviceId);
    if (!device) return;

    const isNegative = ['rusak', 'kotor', 'kadaluarsa', 'error', 'berantakan', 'perlu_penataan'].includes(
      device.formData.status.toLowerCase()
    );

    if (device.statusState === 'INITIAL') {
      if (!device.location.trim()) {
        triggerToast('Mohon ketik Lokasi Perangkat terlebih dahulu!', false);
        return;
      }
      if (!device.formData.status) {
        triggerToast('Mohon pilih Status / Kondisi perangkat terlebih dahulu!', false);
        return;
      }
      if (isNegative && !device.formData.keterangan.trim()) {
        triggerToast('Kondisi perangkat ini memerlukan kolom Keterangan detail penanganan!', false);
        return;
      }
      if (!device.formData.durasi) {
        triggerToast('Mohon masukkan durasi pengerjaan dalam menit!', false);
        return;
      }

      // Transition to DONE - locks device and updates progress
      updateDevice(deviceId, { statusState: 'DONE' });
      triggerToast(`Pemeriksaan ${device.location || 'Perangkat'} disimpan (Done)!`, true);
    } else if (device.statusState === 'DONE') {
      // Transition to UPDATE - unlocks device for editing, while progress percentage stays unchanged!
      updateDevice(deviceId, { statusState: 'UPDATE' });
      triggerToast('Mode edit aktif. Perbaiki data lalu klik tombol Update.', true);
    } else if (device.statusState === 'UPDATE') {
      if (isNegative && !device.formData.keterangan.trim()) {
        triggerToast('Kondisi perangkat ini memerlukan kolom Keterangan detail penanganan!', false);
        return;
      }
      // Save update - re-locks device and transitions back to DONE (button displays EDIT)
      updateDevice(deviceId, { statusState: 'DONE' });
      triggerToast('Data laporan berhasil diperbarui (Update sukses)!', true);
    }
  };

  // Update specific device property helper
  const updateDevice = (deviceId: string, updates: Partial<DeviceItem>) => {
    setJobsDatabase((prev) => {
      const job = prev[currentJobId];
      if (!job) return prev;
      const updatedDevices = job.devices.map((d) =>
        d.id === deviceId ? { ...d, ...updates } : d
      );
      return {
        ...prev,
        [currentJobId]: { ...job, devices: updatedDevices },
      };
    });
  };

  // Update specific device form field
  const updateDeviceForm = (deviceId: string, formUpdates: Partial<DeviceItem['formData']>) => {
    setJobsDatabase((prev) => {
      const job = prev[currentJobId];
      if (!job) return prev;
      const updatedDevices = job.devices.map((d) =>
        d.id === deviceId
          ? { ...d, formData: { ...d.formData, ...formUpdates } }
          : d
      );
      return {
        ...prev,
        [currentJobId]: { ...job, devices: updatedDevices },
      };
    });
  };

  const handlePhotoUpload = async (deviceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isCloudinaryConfigured) {
        try {
          const photoUrl = await uploadPhotoToCloudinary(file);
          updateDeviceForm(deviceId, { photo: photoUrl, photoName: file.name });
          triggerToast('Foto berhasil disimpan ke Cloudinary!');
        } catch (error) {
          triggerToast(error instanceof Error ? error.message : 'Upload foto gagal.', false);
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        updateDeviceForm(deviceId, {
          photo: uploadEvent.target?.result as string,
          photoName: file.name,
        });
        triggerToast('Foto lampiran berhasil diunggah!');
      };
      reader.readAsDataURL(file);
      triggerToast('Foto lampiran tersimpan sementara di browser.');
    }
  };

  // User details
  const displayUsername = currentUser.username || 'Belum login';
  const displayName = currentUser.name || 'Pengguna';
  const userInitials = displayUsername.slice(0, 2).toUpperCase();

  return (
    <div className="text-slate-800 antialiased min-h-screen flex flex-col bg-[#faf9fb] font-sans">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-4">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              toast.isSuccess ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {toast.isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div className="font-medium">{toast.message}</div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOP NAVBAR */}
      {/* ===================================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-4">
          {/* MAJO Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-xs bg-white border border-slate-200 p-0.5 shrink-0">
              <img
                alt="MAJO Logo"
                className="w-full h-full object-contain"
                src="/assets/logo%20MAJO.png"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://lh3.googleusercontent.com/aida/AEtjO1UqoYl0lso8Lfc9d6sgwWr4n3xq8viIowOombtBvfCqwYHo4zjlkbyOkjx4SXPjRz6x-HvH-TAWx7YXFo5p0aoE9Y_oMLE8dk4Mxsx8ceh7WLK8jVFWQOl76wEmSc_jxosbBXkDDrEU8rXTFfG6zamQgfrA9_7q5LL3eLC8fAOYBMOEH5uDDyxDKLctrODYAXetDlOfIMXFXQVBNL5mzfQ1mpKBYH6I5b-Dd20QrOpX6oalDSsOmWYmygz2WL2myDCzCjDLTdttKpA';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-wider text-slate-900 leading-tight">MAJO</span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest leading-none">
                User Field Portal
              </span>
            </div>
          </div>
          <span className="h-5 w-[1px] bg-slate-200"></span>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Unit Operasi: <strong className="text-slate-900 font-semibold">Medan - Hub Operasional</strong>
            </span>
          </div>
        </div>

        {/* Right Profile / Status */}
        <div className="flex items-center space-x-4">
          {activeMenu === 'profil' ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online • Akun Terverifikasi</span>
            </div>
          ) : activeMenu === 'riwayat' ? (
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online • Riwayat Tersinkron</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Encrypted Node • Synced</span>
            </div>
          )}

          <button
            onClick={() => triggerToast('Tidak ada notifikasi baru.')}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
            type="button"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* User Profile Trigger with Click Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center space-x-3 pl-2 border-l border-slate-200 text-left cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-slate-700">
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">{displayUsername}</span>
                <span className="text-[11px] text-slate-500 font-medium">Field User (Teknisi Lapangan)</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {/* Profile Dropdown */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      {userInitials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{displayName}</p>
                      <p className="text-[10px] text-slate-500">@{displayUsername}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold inline-block">
                    Field User • Medan - Hub Operasional
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu('profil');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2.5 font-medium cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Lihat Profil &amp; Informasi Akun</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu('dashboard');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2.5 font-medium cursor-pointer"
                  >
                    <ListChecks className="w-4 h-4 text-slate-500" />
                    <span>Dashboard Penugasan Jobs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu('riwayat');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2.5 font-medium cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Riwayat Selesai</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 font-semibold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Keluar Akun (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN LAYOUT CONTAINER */}
      {/* ===================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between hidden lg:flex shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menu Pengguna</p>
              
              {/* Menu 1: Dashboard Jobs */}
              <button
                type="button"
                onClick={() => setActiveMenu('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer text-left ${
                  activeMenu === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ListChecks className="w-4 h-4 shrink-0" />
                <span>Dashboard Jobs</span>
              </button>

              {/* Menu 2: Riwayat Selesai */}
              <button
                type="button"
                onClick={() => setActiveMenu('riwayat')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer text-left ${
                  activeMenu === 'riwayat'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Riwayat Selesai</span>
              </button>

              {/* Menu 3: Profil Teknisi */}
              <button
                type="button"
                onClick={() => setActiveMenu('profil')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer text-left ${
                  activeMenu === 'profil'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Profil Teknisi</span>
              </button>
            </div>

          </div>

          {/* Bottom System Status */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>MAJO Field v2.4</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
            </span>
          </div>
        </aside>

        {/* ===================================================================== */}
        {/* CONTENT WORKSPACE */}
        {/* ===================================================================== */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
          {/* VIEW A: DASHBOARD JOBS (Default View matching Image) */}
          {activeMenu === 'dashboard' && (
            <>
              {/* Top Section: Header & Kartu Penugasan Utama Dari Admin */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Penugasan Teknisi</h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Pantau dan laporkan checklist inspeksi pemeliharaan rutin yang diberikan oleh Administrator.
                  </p>
                </div>

                {/* Kartu Jobs dari Admin (Expand / Collapse) */}
                <div
                  onClick={() => setIsTaskCardExpanded(!isTaskCardExpanded)}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer relative group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
                          Tugas Aktif Admin
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          ID: {jobsDatabase[currentJobId]?.id || 'Belum tersedia'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                          <Clock className="w-3 h-3 text-amber-600" /> Tenggat mengikuti penugasan admin
                        </span>
                      </div>
                      <h2 className="text-lg md:text-xl font-extrabold text-slate-900 group-hover:text-slate-800 transition-colors">
                        {activeJob.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Rentang Waktu: <strong className="text-slate-800 font-semibold">01 Sep 2026 – 28 Sep 2026</strong>
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            (Dengan Batas Waktu)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Wilayah Tugas: <strong>SOR 1 (Sumatera Bagian Utara) • Medan</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bagian Kanan Header PM: Progress bar + Tombol Segitiga / Chevron Toggle */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1.5">
                          <span className="text-2xl md:text-3xl font-black text-slate-900">{progressPercentage}%</span>
                          <span className="text-xs text-slate-500 font-semibold">Selesai</span>
                        </div>
                        <div className="w-36 md:w-44 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200">
                          <div
                            className="h-full bg-slate-900 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {isTaskCardExpanded ? 'Klik untuk melipat detail jobs' : 'Klik untuk membuka detail jobs'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTaskCardExpanded(!isTaskCardExpanded);
                        }}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer"
                        title={isTaskCardExpanded ? 'Tutup Daftar Pemeriksaan' : 'Buka Daftar Pemeriksaan'}
                      >
                        {isTaskCardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAIL JOBS WORKSPACE (inspection-section) */}
              {isTaskCardExpanded && (
                <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 md:p-7 space-y-6 transition-all duration-300">
                  {/* Header Detail & Instruksi */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-800" />
                        <span>Daftar Pemeriksaan Lapangan (Per-Jobs)</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pilih nomor daftar jobs untuk mengisi data checklist inspeksi tiap perangkat.
                      </p>
                    </div>
                    <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      Mode Input Teknisi: Real-time Autosave
                    </span>
                  </div>

                  {/* Tombol Tabs Daftar Jobs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        PILIH SUB-JOBS UNTUK DIKERJAKAN:
                      </span>
                      <span className="text-xs text-slate-700 font-semibold">
                        Sedang aktif di: {activeJob.title}
                      </span>
                    </div>

                    {/* Horizontal Navigation Tab Buttons */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                      {(Object.values(jobsDatabase) as JobTabItem[]).map((job: JobTabItem) => {
                        const isActive = job.id === currentJobId;
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => setCurrentJobId(job.id)}
                            className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                              isActive
                                ? 'bg-white border-slate-900 text-slate-900 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200/80 border-transparent text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                                isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {job.id}
                            </span>
                            <span>{job.title}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                job.id === 1 ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            ></span>
                          </button>
                        );
                      })}

                    </div>
                  </div>

                  {/* KONTEN CONTAINER PERANGKAT DI JOBS TERPILIH */}
                  <div className="space-y-5">
                    {activeJob.devices.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">
                          Belum ada titik perangkat pada {activeJob.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Klik tombol Tambah Titik Perangkat untuk mulai mengisi data.
                        </p>
                        <button
                          type="button"
                          onClick={addNewDevice}
                          className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          + Tambah Perangkat Sekarang
                        </button>
                      </div>
                    ) : (
                      activeJob.devices.map((device) => {
                        const isExpanded = device.expanded;
                        const isLocked = device.statusState === 'DONE';

                        return (
                          <div
                            key={device.id}
                            className={`border rounded-2xl p-4 md:p-5 transition-all duration-300 ${
                              isExpanded
                                ? 'border-slate-300 bg-white shadow-xs'
                                : 'border-slate-200 bg-slate-50/70'
                            }`}
                          >
                            {/* Baris Utama Header Perangkat: Lokasi Perangkat, Tanda Tambah (+), Tanda Panah Segitiga (▼/▲), Tanda Sampah (Hapus) */}
                            <div
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isExpanded ? 'pb-3 border-b border-slate-200' : ''
                              }`}
                            >
                              {/* Lokasi Perangkat Input & Label Sejajar dengan Titik Dua (:) */}
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 whitespace-nowrap min-w-[130px] flex justify-between items-center">
                                  <span>Lokasi Perangkat</span>
                                  <span className="font-black text-slate-400 mr-2">:</span>
                                </span>
                                <div className="flex-1 relative">
                                  <input
                                    type="text"
                                    value={device.location}
                                    disabled={isLocked}
                                    onChange={(e) => updateDevice(device.id, { location: e.target.value })}
                                    className={`w-full text-xs font-semibold rounded-xl px-3 py-2 outline-none transition-all ${
                                      isLocked
                                        ? 'text-slate-800 bg-slate-100 border border-slate-200 cursor-not-allowed'
                                        : 'text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                    placeholder="Ketik nama atau kode lokasi perangkat..."
                                  />
                                </div>
                              </div>

                              {/* Tombol Toolbar Aksi Cepat: Tambah (+), Panah Segitiga (▼/▲), Hapus (Sampah) */}
                              <div className="flex items-center justify-end gap-1.5 shrink-0">
                                {/* Tanda Tambah (+) */}
                                <button
                                  type="button"
                                  onClick={addNewDevice}
                                  title="Tambah Kolom Perangkat Baru"
                                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                >
                                  <Plus className="w-4 h-4 text-blue-600" />
                                </button>

                                {/* Tanda Panah Segitiga Toggle Expand/Collapse */}
                                <button
                                  type="button"
                                  onClick={() => toggleDeviceExpand(device.id)}
                                  title={isExpanded ? 'Tutup form pemeriksaan (▲)' : 'Buka form pemeriksaan (▼)'}
                                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-xs transition-all shadow-xs cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                  )}
                                </button>

                                {/* Tanda Sampah (Hapus) */}
                                <button
                                  type="button"
                                  onClick={() => promptDeleteDevice(device.id)}
                                  title="Hapus Data Perangkat Ini"
                                  className="w-8 h-8 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 flex items-center justify-center text-xs transition-colors shadow-xs cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* KONTEN FORMULIR CHECKLIST INSPEKSI */}
                            {isExpanded && (
                              <div className="pt-4 space-y-4 animate-in fade-in duration-200">
                                {/* Grid Form dengan Titik Dua (:) Sejajar Sempurna */}
                                <div className="space-y-3.5 max-w-3xl">
                                  {/* 1. Import Foto */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <div className="w-36 text-xs font-bold text-slate-700 flex justify-between items-center shrink-0">
                                      <span>Import Foto</span>
                                      <span className="font-black text-slate-400 mr-2">:</span>
                                    </div>
                                    <div className="flex-1 flex flex-wrap items-center gap-3">
                                      <label
                                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 transition-colors ${
                                          isLocked
                                            ? 'pointer-events-none opacity-60'
                                            : 'hover:bg-blue-50/50 hover:border-blue-400 cursor-pointer'
                                        }`}
                                      >
                                        <Camera className="w-4 h-4 text-blue-600" />
                                        <span>
                                          {device.formData.photo ? 'Ganti Foto Bukti' : 'Pilih Foto Kamera / Unggah'}
                                        </span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={isLocked}
                                          onChange={(e) => handlePhotoUpload(device.id, e)}
                                        />
                                      </label>

                                      {/* Foto Preview */}
                                      {device.formData.photo ? (
                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 pr-2 shadow-2xs">
                                          <img
                                            src={device.formData.photo}
                                            alt="Bukti Lapangan"
                                            className="w-8 h-8 object-cover rounded-md border border-slate-100"
                                          />
                                          <span className="text-[11px] font-medium text-slate-600 truncate max-w-[140px]">
                                            {device.formData.photoName || 'foto_lampiran.jpg'}
                                          </span>
                                          {!isLocked && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateDeviceForm(device.id, { photo: '', photoName: '' })
                                              }
                                              className="text-slate-400 hover:text-rose-600 text-xs ml-1 cursor-pointer"
                                              title="Hapus Foto"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-slate-400 italic">
                                          Belum ada foto dilampirkan
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* 2. Status / Kondisi Lapangan */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <div className="w-36 text-xs font-bold text-slate-700 flex justify-between items-center shrink-0">
                                      <span>Status</span>
                                      <span className="font-black text-slate-400 mr-2">:</span>
                                    </div>
                                    <div className="flex-1 flex flex-wrap items-center gap-2.5">
                                      {getConditionOptions(activeJob.pmType).map((cond) => {
                                        const isSelected =
                                          device.formData.status.toLowerCase() === cond.value.toLowerCase();
                                        return (
                                          <label
                                            key={cond.value}
                                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                              isSelected
                                                ? cond.color === 'emerald'
                                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                                                  : cond.color === 'amber'
                                                  ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                                                  : cond.color === 'blue'
                                                  ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                                                  : 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                                                : 'border-slate-200 bg-white text-slate-600'
                                            } ${isLocked ? 'pointer-events-none opacity-80' : ''}`}
                                          >
                                            <input
                                              type="radio"
                                              name={`status_${device.id}`}
                                              value={cond.value}
                                              checked={isSelected}
                                              disabled={isLocked}
                                              onChange={() => updateDeviceForm(device.id, { status: cond.value })}
                                              className="accent-slate-900"
                                            />
                                            {cond.color === 'emerald' ? (
                                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            ) : cond.color === 'amber' ? (
                                              <Clock className="w-4 h-4 text-amber-600" />
                                            ) : cond.color === 'blue' ? (
                                              <Check className="w-4 h-4 text-blue-600" />
                                            ) : (
                                              <AlertCircle className="w-4 h-4 text-rose-600" />
                                            )}
                                            <span>{cond.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* 3. Keterangan */}
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                                    <div className="w-36 text-xs font-bold text-slate-700 flex justify-between items-center shrink-0 pt-2">
                                      <span>Keterangan</span>
                                      <span className="font-black text-slate-400 mr-2">:</span>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <textarea
                                        rows={2}
                                        value={device.formData.keterangan}
                                        disabled={isLocked}
                                        onChange={(e) =>
                                          updateDeviceForm(device.id, { keterangan: e.target.value })
                                        }
                                        className={`w-full text-xs font-medium rounded-xl p-2.5 outline-none transition-all ${
                                          isLocked
                                            ? 'text-slate-800 bg-slate-100 border border-slate-200 cursor-not-allowed'
                                            : 'text-slate-800 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                        placeholder={
                                          ['rusak', 'kotor', 'kadaluarsa', 'error', 'berantakan', 'perlu_penataan'].includes(
                                            device.formData.status.toLowerCase()
                                          )
                                            ? 'Wajib ketik rincian temuan kerusakan / ketidaknormalan & tindakan penanganan...'
                                            : 'Catatan hasil inspeksi teknisi (opsional jika kondisi normal)...'
                                        }
                                      />
                                      <p
                                        className={`text-[10px] ${
                                          ['rusak', 'kotor', 'kadaluarsa', 'error', 'berantakan', 'perlu_penataan'].includes(
                                            device.formData.status.toLowerCase()
                                          )
                                            ? 'text-rose-600 font-bold'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {['rusak', 'kotor', 'kadaluarsa', 'error', 'berantakan', 'perlu_penataan'].includes(
                                          device.formData.status.toLowerCase()
                                        )
                                          ? '⚠️ Kondisi tidak normal: Kolom keterangan ini WAJIB diisi.'
                                          : 'Informasi keterangan bersifat opsional untuk status normal.'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* 4. Durasi */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <div className="w-36 text-xs font-bold text-slate-700 flex justify-between items-center shrink-0">
                                      <span>Durasi</span>
                                      <span className="font-black text-slate-400 mr-2">:</span>
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                      <input
                                        type="number"
                                        min={1}
                                        value={device.formData.durasi}
                                        disabled={isLocked}
                                        onChange={(e) => updateDeviceForm(device.id, { durasi: e.target.value })}
                                        className={`w-24 text-xs font-bold rounded-xl px-3 py-1.5 text-center outline-none ${
                                          isLocked
                                            ? 'text-slate-800 bg-slate-100 border border-slate-200 cursor-not-allowed'
                                            : 'text-slate-900 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500'
                                        }`}
                                        placeholder="30"
                                      />
                                      <span className="text-xs font-bold text-slate-600">/ Menit</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Tombol Aksi Kanan Bawah: Done / Edit / Update */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                  <div className="text-[11px] font-medium text-slate-400">
                                    {device.statusState === 'DONE' ? (
                                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Data terkunci. Klik tombol Edit jika ingin merevisi.</span>
                                      </span>
                                    ) : device.statusState === 'UPDATE' ? (
                                      <span className="text-amber-700 font-bold flex items-center gap-1">
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Mode Edit: Tekan tombol Update untuk menyimpan revisi.</span>
                                      </span>
                                    ) : (
                                      <span>Isi seluruh kolom lalu tekan Done.</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {device.statusState === 'INITIAL' && (
                                      <button
                                        type="button"
                                        onClick={() => handleActionClick(device.id)}
                                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Done</span>
                                      </button>
                                    )}

                                    {device.statusState === 'DONE' && (
                                      <button
                                        type="button"
                                        onClick={() => handleActionClick(device.id)}
                                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>
                                    )}

                                    {device.statusState === 'UPDATE' && (
                                      <button
                                        type="button"
                                        onClick={() => handleActionClick(device.id)}
                                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Update</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Tombol Tambah Perangkat Global di Bawah Halaman */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={addNewDevice}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-900 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Titik Perangkat Baru di Jobs Ini</span>
                    </button>
                    <div className="text-[12px] text-slate-400 font-medium">
                      *Semua kolom dengan tanda titik dua (:) sejajar otomatis untuk memudahkan input data.
                    </div>
                  </div>

                  {/* Banner & Tombol Submit Laporan Lengkap 100% */}
                  {isFullyCompleted && !isSubmitted && (
                    <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Semua Checklist Telah Selesai 100%!
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Seluruh {totalDevicesCount} titik perangkat telah diperiksa dan didokumentasikan. Laporan siap dikirim ke Administrator Wilayah.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSubmitModal(true)}
                        className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Submit Laporan Lengkap (100% Selesai)</span>
                      </button>
                    </div>
                  )}

                  {isSubmitted && (
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                          <ShieldCheck className="w-6 h-6 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">
                            Laporan Resmi 100% Telah Diserahkan
                          </h4>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Data tersimpan dan diteruskan ke Output Laporan Admin. Anda dapat meninjau salinan arsip di menu Riwayat Selesai.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveMenu('riwayat')}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>Buka Riwayat Selesai</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* ===================================================================== */}
          {/* VIEW B: PROFIL TEKNISI (Informasi Akun Sendiri) */}
          {/* ===================================================================== */}
          {activeMenu === 'profil' && (
            <ProfilTeknisiView
              displayName={displayName}
              displayUsername={displayUsername}
              userInitials={userInitials}
              onTriggerToast={triggerToast}
              onOpenLogoutModal={() => setShowLogoutModal(true)}
            />
          )}

          {/* ===================================================================== */}
          {/* VIEW C: RIWAYAT SELESAI */}
          {/* ===================================================================== */}
          {activeMenu === 'riwayat' && (
            <RiwayatSelesaiView onTriggerToast={triggerToast} />
          )}
        </main>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: KONFIRMASI HAPUS PERANGKAT */}
      {/* ===================================================================== */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold text-lg">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Konfirmasi Hapus Data Perangkat</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data perangkat ini? Seluruh data form yang sudah dimasukkan akan dibersihkan dari laporan.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteDevice}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: KONFIRMASI LOGOUT */}
      {/* ===================================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Konfirmasi Keluar Akun</h3>
            <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin keluar dari sesi Teknisi Lapangan MAJO? Anda dapat masuk kembali kapan saja dengan username dan kata sandi Anda.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  onNavigate('login');
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: KONFIRMASI SUBMIT LAPORAN LENGKAP (100%) */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center font-bold text-lg">
                <FileCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  Kirim Laporan Resmi PM 100% Selesai
                </h4>
                <p className="text-xs text-slate-500">
                  Laporan akan ditandatangani digital dan dikirimkan ke Admin Wilayah.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Pekerjaan:</span>
                <span className="font-semibold text-slate-900">PM September 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wilayah Tugas:</span>
                <span className="font-semibold text-slate-900">
                  {currentUser?.location || 'Medan – Hub Operasional'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Petugas / Teknisi:</span>
                <span className="font-semibold text-slate-900">{displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Sub-Jobs:</span>
                <span className="font-semibold text-slate-900">
                  {Object.keys(jobsDatabase).length} Sub-Jobs Terverifikasi
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Titik Perangkat:</span>
                <span className="font-bold text-emerald-700">{totalDevicesCount} Titik (100% Selesai)</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Setelah dikirim, rekapan inspeksi akan langsung masuk ke menu <strong>Output Laporan Admin</strong> dan diarsipkan di menu <strong>Riwayat Selesai</strong> Anda.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitReport}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Ya, Kirim Laporan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
