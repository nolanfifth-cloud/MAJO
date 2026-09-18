import React, { useState, useMemo, useEffect } from 'react';
import { PmItem, AuthView } from '../types';
import { CreateJobsView } from './CreateJobsView';
import { LinkPortalView } from './LinkPortalView';
import { ProfileSettingsView } from './ProfileSettingsView';
import { downloadPmReportExcel } from '../services/excelExport';
import { getPortalConfig } from '../services/workflowStore';
import { loadAdminJobsFromFirestore, saveAdminJobToFirestore } from '../services/firestoreStore';

interface AdminDashboardProps {
  onNavigate: (view: AuthView) => void;
  currentUser?: {
    username: string;
    name?: string;
    role?: string;
  };
}

const INITIAL_PMS: PmItem[] = [];
/*
  {
    id: 'pm-row-1',
    code: 'PM-2026-SEP-001',
    title: 'PM September 2026 - Inspeksi & Pemeliharaan Rutin Gardu & Hub Operasional',
    dates: '01 Sep - 28 Sep 2026',
    startDate: '2026-09-01',
    endDate: '2026-09-28',
    pic: 'Agus Setiawan, S.T.',
    picRole: 'Lead Teknisi Lapangan',
    progress: 100,
    doneCount: 56,
    totalCount: 56,
    pendingCount: 0,
    subStationCount: 12,
    regions: 'Medan, Jakarta, Surabaya',
    regionsDetail: [
      { name: 'Medan (4 Lokasi)', percent: '100% Selesai', color: 'bg-primary' },
      { name: 'Jakarta (5 Lokasi)', percent: '100% Selesai', color: 'bg-primary' },
      { name: 'Surabaya (3 Lokasi)', percent: '100% Selesai', color: 'bg-primary' },
    ],
    recentLog: {
      name: 'Agus Setiawan, S.T.',
      avatar: 'AS',
      activity: 'Unggah foto bukti & kalibrasi gardu trafo #04 Medan.',
      time: '12 menit yang lalu',
    },
    modules: [
      { name: 'Pemeriksaan Fisik Gardu & Transformator Utama', itemCount: 18 },
      { name: 'Panel Distribusi Tegangan Menengah (Cubicle 20kV)', itemCount: 14 },
      { name: 'Sistem Proteksi & Grounding Earthing', itemCount: 12 },
      { name: 'Fasilitas Proteksi Lingkungan & Baterai Catu Daya', itemCount: 12 },
    ],
  },
  {
    id: 'pm-row-2',
    code: 'PM-2026-SEP-002',
    title: 'Audit & Kalibrasi Sensor Suhu Enclosure Wilayah Timur',
    dates: '05 Sep - 20 Sep 2026',
    startDate: '2026-09-05',
    endDate: '2026-09-20',
    pic: 'Dimas Ramadhan',
    picRole: 'Teknisi Instrumentasi',
    progress: 42,
    doneCount: 10,
    totalCount: 24,
    pendingCount: 14,
    subStationCount: 8,
    regions: 'Surabaya, Malang, Banyuwangi',
    regionsDetail: [
      { name: 'Surabaya (3 Titik)', percent: '60%', color: 'bg-primary' },
      { name: 'Malang (3 Titik)', percent: '40%', color: 'bg-tertiary' },
      { name: 'Banyuwangi (2 Titik)', percent: '25%', color: 'bg-secondary' },
    ],
    recentLog: {
      name: 'Dimas Ramadhan',
      avatar: 'DR',
      activity: 'Input pembacaan probe thermocouple #02 Enclosure Timur.',
      time: '2 jam yang lalu',
    },
    modules: [
      { name: 'Kalibrasi Termokopel & RTD Sensor Ruang', itemCount: 8 },
      { name: 'Pembersihan Ventilasi Sirkulasi Rak Baterai', itemCount: 8 },
      { name: 'Uji Alarm Ambang Suhu Ekstrem PLC', itemCount: 8 },
    ],
  },
]; */

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  currentUser = { username: '', name: '', role: 'admin' },
}) => {
  // Primary list state
  const [pmList, setPmList] = useState<PmItem[]>(INITIAL_PMS);
  const [selectedPmId, setSelectedPmId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('Semua Region');
  const [isPortalConfigured, setIsPortalConfigured] = useState<boolean>(() => {
    try {
      return localStorage.getItem('majo_portal_configured') === 'true';
    } catch {
      return false;
    }
  });
  const [hasConfiguredLocation, setHasConfiguredLocation] = useState<boolean>(() => {
    try {
      const config = getPortalConfig();
      return config.masterWilayah.length > 0 || config.masterGroups.some((group) => group.locations.length > 0);
    } catch {
      return false;
    }
  });
  const [showWarningBanner, setShowWarningBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('majo_portal_configured') !== 'true';
    } catch {
      return true;
    }
  });

  // Synchronize with localStorage (created jobs by admin & completed reports by user)
  useEffect(() => {
    try {
      const portalConfigured = localStorage.getItem('majo_portal_configured') === 'true';
      const portalConfig = getPortalConfig();
      const hasLocation =
        portalConfig.masterWilayah.length > 0 ||
        portalConfig.masterGroups.some((group) => group.locations.length > 0);
      setHasConfiguredLocation(hasLocation);
      if (portalConfigured) {
        setIsPortalConfigured(true);
        setShowWarningBanner(!hasLocation);
      }

      let baseList = [...INITIAL_PMS];
      const savedAdminJobs = localStorage.getItem('majo_admin_created_jobs');
      if (savedAdminJobs) {
        const parsedAdminJobs = JSON.parse(savedAdminJobs);
        if (Array.isArray(parsedAdminJobs) && parsedAdminJobs.length > 0) {
          const existingIds = new Set(baseList.map((p) => p.id));
          const newJobs = parsedAdminJobs.filter((p) => !existingIds.has(p.id));
          baseList = [...newJobs, ...baseList];
        }
      }

      const savedReports = localStorage.getItem('majo_completed_reports');
      if (savedReports) {
        const parsedReports = JSON.parse(savedReports);
        if (Array.isArray(parsedReports) && parsedReports.length > 0) {
          const latestReport = parsedReports[0];
          baseList = baseList.map((pm) => {
            if (pm.id === 'pm-row-1' || pm.code === latestReport.id || pm.title.includes('PM September 2026')) {
              return {
                ...pm,
                progress: 100,
                doneCount: pm.totalCount,
                pendingCount: 0,
                recentLog: {
                  name: latestReport.technicianName || 'Agus Setiawan, S.T.',
                  avatar: (latestReport.technicianName || 'Agus Setiawan')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase(),
                  activity: `Laporan 100% lengkap diserahkan oleh teknisi (${latestReport.pointsCount || 8} titik diverifikasi).`,
                  time: latestReport.completedAt || 'Baru saja',
                },
              };
            }
            return pm;
          });
        }
      }

      setPmList(baseList);
      if (!baseList.length) setSelectedPmId('');
    } catch {
      // Ignore parse errors
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAdminJobsFromFirestore().then((cloudJobs) => {
      if (!cancelled && cloudJobs.length > 0) {
        setPmList(cloudJobs);
        setSelectedPmId(cloudJobs[0].id);
      }
    }).catch(() => {
      // Local jobs remain available when Firestore is unavailable.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Active navigation tab in sidebar
  const [activeNav, setActiveNav] = useState<'dashboard' | 'create-jobs' | 'link-portal' | 'pengaturan-profile'>('dashboard');

  // Modals state
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  const [isViewConfigOpen, setIsViewConfigOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLinkPortalModalOpen, setIsLinkPortalModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Target item for edit/delete
  const [modalTargetPm, setModalTargetPm] = useState<PmItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editRegions, setEditRegions] = useState('');
  const [editPic, setEditPic] = useState('');
  const [editModules, setEditModules] = useState<{ name: string; itemCount: number }[]>([]);

  // Delete verification
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);

  // Toasts
  const [exportToast, setExportToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [bottomToast, setBottomToast] = useState<{ show: boolean; title: string; message: string; icon: string }>({
    show: false,
    title: '',
    message: '',
    icon: 'check_circle',
  });
  const [isExporting, setIsExporting] = useState(false);

  // Notification dropdown
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Selected item computed
  const currentSelectedPm = useMemo(() => {
    return pmList.find((item) => item.id === selectedPmId) || pmList[0] || null;
  }, [pmList, selectedPmId]);

  // Filtered list
  const filteredPms = useMemo(() => {
    return pmList.filter((pm) => {
      const matchSearch =
        pm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pm.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pm.regions.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pm.pic.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRegion =
        selectedRegionFilter === 'Semua Region' ||
        pm.regions.toLowerCase().includes(selectedRegionFilter.toLowerCase());

      return matchSearch && matchRegion;
    });
  }, [pmList, searchQuery, selectedRegionFilter]);

  // Trigger Toast helper
  const triggerBottomToast = (title: string, message: string, icon = 'check_circle') => {
    setBottomToast({ show: true, title, message, icon });
    setTimeout(() => {
      setBottomToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Open Edit or Create Modal
  const handleOpenEditModal = (pm: PmItem | null, isNew = false) => {
    setIsCreatingNew(isNew);
    if (isNew || !pm) {
      setModalTargetPm(null);
      setEditTitle('');
      setEditStart('2026-10-01');
      setEditEnd('2026-10-28');
      setEditRegions('Medan, Jakarta, Surabaya');
      setEditPic('');
      setEditModules([
        { name: 'Pemeriksaan Gardu & Transformator Induk', itemCount: 12 },
        { name: 'Uji Arus Beban Puncak & Suhu Koneksi', itemCount: 8 },
      ]);
    } else {
      setModalTargetPm(pm);
      setEditTitle(pm.title);
      setEditStart(pm.startDate);
      setEditEnd(pm.endDate);
      setEditRegions(pm.regions);
      setEditPic(pm.pic);
      setEditModules(
        pm.modules || [
          { name: 'Pemeriksaan Fisik Gardu & Transformator Utama', itemCount: 18 },
          { name: 'Panel Distribusi Tegangan Menengah (Cubicle 20kV)', itemCount: 14 },
          { name: 'Sistem Proteksi & Grounding Earthing', itemCount: 12 },
          { name: 'Fasilitas Proteksi Lingkungan & Baterai Catu Daya', itemCount: 12 },
        ]
      );
    }
    setIsEditModalOpen(true);
  };

  // Save Edit / Create PM
  const handleSavePm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    if (isCreatingNew) {
      const newId = `pm-row-${Date.now()}`;
      const newCode = `PM-2026-OCT-${String(pmList.length + 1).padStart(3, '0')}`;
      const newPm: PmItem = {
        id: newId,
        code: newCode,
        title: editTitle.trim(),
        dates: `${editStart} - ${editEnd}`,
        startDate: editStart,
        endDate: editEnd,
        pic: editPic,
        picRole: 'Lead Teknisi Lapangan',
        progress: 0,
        doneCount: 0,
        totalCount: editModules.reduce((acc, m) => acc + m.itemCount, 0) || 20,
        pendingCount: editModules.reduce((acc, m) => acc + m.itemCount, 0) || 20,
        subStationCount: 6,
        regions: editRegions.trim(),
        regionsDetail: editRegions.split(',').map((r) => ({
          name: `${r.trim()} (Aktif)`,
          percent: '0%',
          color: 'bg-primary',
        })),
        recentLog: {
          name: editPic,
          avatar: editPic.slice(0, 2).toUpperCase(),
          activity: 'Penugasan baru telah dibuat dan siap didistribusikan.',
          time: 'Baru saja',
        },
        modules: editModules,
      };

      setPmList((prev) => [newPm, ...prev]);
      setSelectedPmId(newId);
      setIsEditModalOpen(false);
      triggerBottomToast('Pekerjaan PM Baru Berhasil Dibuat', `Penugasan ${newCode} telah tersimpan di sistem.`);
    } else if (modalTargetPm) {
      setPmList((prev) =>
        prev.map((item) =>
          item.id === modalTargetPm.id
            ? {
                ...item,
                title: editTitle.trim(),
                startDate: editStart,
                endDate: editEnd,
                dates: `${editStart} - ${editEnd}`,
                regions: editRegions.trim(),
                pic: editPic,
                modules: editModules,
              }
            : item
        )
      );
      setIsEditModalOpen(false);
      triggerBottomToast('Konfigurasi PM Berhasil Disimpan', 'Pembaruan tugas telah diterapkan dan disinkronkan.');
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (pm: PmItem) => {
    setModalTargetPm(pm);
    setDeleteAcknowledged(false);
    setIsDeleteModalOpen(true);
  };

  // Execute Delete
  const handleExecuteDelete = () => {
    if (!modalTargetPm) return;
    const targetId = modalTargetPm.id;
    const remaining = pmList.filter((item) => item.id !== targetId);
    setPmList(remaining);
    if (selectedPmId === targetId) {
      setSelectedPmId(remaining[0]?.id || '');
    }
    setIsDeleteModalOpen(false);
    setModalTargetPm(null);
    triggerBottomToast('Pekerjaan Berhasil Dihapus', 'Data pekerjaan PM telah dihapus permanen dari server MAJO.', 'delete');
  };

  // Export a formatted XLSX workbook with summary and verification tables.
  const handleExportExcel = async (pm: PmItem | null) => {
    const target = pm || currentSelectedPm;
    if (!target) return;

    setIsExporting(true);
    try {
      await downloadPmReportExcel(target);
      setExportToast({
        show: true,
        message: `Laporan ${target.code} (${target.doneCount}/${target.totalCount} Checklist Selesai) tersimpan.`,
      });
      setTimeout(() => {
        setExportToast((prev) => ({ ...prev, show: false }));
      }, 4500);
    } catch (error) {
      setExportToast({
        show: true,
        message: error instanceof Error ? error.message : 'Export laporan gagal. Silakan coba lagi.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen relative flex">
      {/* ========================================================================= */}
      {/* SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-outline-variant/20">
        <div className="flex flex-col">
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center p-0.5">
                <img
                  alt="MAJO Logo"
                  className="w-full h-full object-contain"
                  src="/assets/logo%20MAJO.png"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-headline-md text-headline-md tracking-tight text-on-surface font-extrabold">
                MAJO
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-4 py-6">
            <p className="px-3 pb-2 font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Navigation
            </p>
            <nav className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setActiveNav('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-DEFAULT transition-colors font-label-md text-left cursor-pointer ${
                  activeNav === 'dashboard'
                    ? 'bg-primary-container text-on-primary-container shadow-xs font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-normal'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('create-jobs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-DEFAULT transition-colors font-label-md text-left cursor-pointer ${
                  activeNav === 'create-jobs'
                    ? 'bg-primary-container text-on-primary-container shadow-xs font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-normal'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">add_task</span>
                <span>Create Jobs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('link-portal')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-DEFAULT transition-colors font-label-md text-left cursor-pointer ${
                  activeNav === 'link-portal'
                    ? 'bg-primary-container text-on-primary-container shadow-xs font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-normal'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">hub</span>
                <span>Link Portal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('pengaturan-profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-DEFAULT transition-colors font-label-md text-left cursor-pointer ${
                  activeNav === 'pengaturan-profile'
                    ? 'bg-primary-container text-on-primary-container shadow-xs font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-normal'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                <span>Pengaturan / Profile</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Enclave Vault */}
        <div className="p-3 m-4 rounded-DEFAULT bg-surface-container-low flex flex-col gap-2 border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Enclave Vault
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified_user</span>
            <span className="font-body-sm text-body-sm text-on-surface font-medium">Passkey Active</span>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT WRAPPER */}
      {/* ========================================================================= */}
      <div className="pl-72 flex flex-col min-h-screen w-full">
        {/* Top Header */}
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-8 flex items-center justify-between border-b border-outline-variant/20">
          {/* Empty Space (Search removed per user request without shifting layout) */}
          <div className="flex-1 max-w-md" />

          {/* Top Right Badges & Controls */}
          <div className="flex items-center gap-4 relative">
            {/* Encrypted Node status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/20">
              <span className="inline-block w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Encrypted Node
              </span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                aria-label="Notifications"
                className="relative p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                type="button"
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest"></span>
              </button>

              {showNotificationMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 p-3 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                    <span className="text-xs font-bold text-on-surface">Pemberitahuan Sistem</span>
                    <span className="text-[10px] text-primary font-semibold">Tandai Dibaca</span>
                  </div>
                  <div className="py-2 space-y-2">
                    <div className="p-2 rounded-lg bg-surface-container-low text-xs">
                      <p className="font-semibold text-on-surface">Inspeksi Selesai 100%</p>
                      <p className="text-secondary text-[11px]">Tidak ada notifikasi baru.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Info with Dropdown / Logout */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-2 border-l border-outline-variant/30 hover:opacity-80 transition-opacity cursor-pointer text-left"
              >
                <div className="flex flex-col text-right">
                  <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold">
                    {currentUser.name || 'Belum login'}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">Region Central</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-label-sm shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 p-2 z-50">
                  <div className="px-3 py-2 border-b border-outline-variant/20">
                    <p className="text-xs font-bold text-on-surface">{currentUser.name || 'Belum login'}</p>
                    <p className="text-[11px] text-secondary">@{currentUser.username}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      Admin Berwenang
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveNav('pengaturan-profile');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-2 cursor-pointer mt-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                    <span>Pengaturan &amp; Profil Pengguna</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="w-full text-left px-3 py-2 text-xs text-error hover:bg-error-container/20 rounded-lg flex items-center gap-2 cursor-pointer border-t border-outline-variant/20 mt-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Keluar dari Dashboard</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="w-full pt-16 bg-background flex-1">
          {activeNav === 'create-jobs' ? (
            <CreateJobsView
              onNavigateToDashboard={() => setActiveNav('dashboard')}
              onJobCreated={(newPm) => {
                setPmList((prev) => {
                  const updated = [newPm, ...prev];
                  void saveAdminJobToFirestore(newPm, currentUser?.username).catch(() => {
                    // localStorage remains the fallback when cloud persistence fails.
                  });
                  try {
                    const saved = localStorage.getItem('majo_admin_created_jobs');
                    const existing = saved ? JSON.parse(saved) : [];
                    localStorage.setItem('majo_admin_created_jobs', JSON.stringify([newPm, ...existing]));
                  } catch {
                    // Ignore
                  }
                  return updated;
                });
                setSelectedPmId(newPm.id);
                triggerBottomToast(
                  'Pekerjaan Diluncurkan',
                  `Pekerjaan "${newPm.title}" berhasil diterbitkan dan siap dikerjakan tim teknisi.`,
                  'check_circle'
                );
              }}
            />
          ) : activeNav === 'link-portal' ? (
            <LinkPortalView
              onNavigateToDashboard={() => setActiveNav('dashboard')}
              onNavigateToCreateJobs={() => setActiveNav('create-jobs')}
              onConfigurationCompleted={() => {
                setIsPortalConfigured(true);
                setHasConfiguredLocation(true);
                setShowWarningBanner(false);
                try {
                  localStorage.setItem('majo_portal_configured', 'true');
                } catch {
                  // Ignore
                }
              }}
            />
          ) : activeNav === 'pengaturan-profile' ? (
            <ProfileSettingsView
              onNavigateToDashboard={() => setActiveNav('dashboard')}
              onNavigateToCreateJobs={() => setActiveNav('create-jobs')}
              onNavigateToLinkPortal={() => setActiveNav('link-portal')}
              onLogout={() => onNavigate('login')}
              currentUser={{
                username: currentUser?.username || '',
                name: currentUser?.name || '',
                role: currentUser?.role || 'admin',
              }}
            />
          ) : (
            <div className="p-8 lg:p-10 flex flex-col gap-8">
              {/* Dashboard Top Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-extrabold">
                      Dashboard Utama
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Mode Inisialisasi
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-secondary">
                    Selamat datang di Portal Operasional MAJO. Sistem siap digunakan untuk mengelola skema wilayah,
                    konfigurasi penugasan tim, dan monitoring checklist PM.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveNav('link-portal')}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:bg-surface-container-low transition-colors font-label-md text-label-md text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-outline text-[18px] group-hover:text-primary transition-colors">
                      hub
                    </span>
                    <span>Setup Link Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('create-jobs')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-DEFAULT bg-on-primary-fixed text-on-primary shadow-xs hover:bg-primary-container transition-colors font-label-md text-label-md font-semibold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>+ Buat Pekerjaan Baru</span>
                  </button>
                </div>
              </div>

            {/* Warning Banner (Displayed when in initialization mode or toggled) */}
            {showWarningBanner && (!isPortalConfigured || !hasConfiguredLocation) && (
              <div className="p-4 rounded-DEFAULT bg-surface-container-lowest border border-tertiary/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-tertiary-fixed/40 text-tertiary shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[22px]">warning</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-label-md font-bold text-on-surface">
                        Wajib: Lengkapi Link Portal & Lokasi Operasional
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] font-bold uppercase tracking-wider">
                        ACTION REQUIRED
                      </span>
                    </div>
                    <p className="text-body-sm text-secondary mt-0.5">
                      Anda belum dapat membagikan tautan pendaftaran. Lengkapi Link Portal dan tambahkan minimal satu lokasi operasional terlebih dahulu agar tautan staf terbuka.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveNav('link-portal')}
                    className="flex items-center gap-2 px-4 py-2 rounded-DEFAULT bg-[#091c33] text-white font-label-md text-xs font-semibold hover:bg-primary transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">hub</span>
                    <span>Buka Link Portal →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Metric Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Pekerjaan */}
              <div className="p-5 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col justify-between border border-outline-variant/20 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    Total Pekerjaan
                  </span>
                  <span className="p-2 rounded-DEFAULT bg-surface-container-low text-primary">
                    <span className="material-symbols-outlined text-[18px]">assignment</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold">
                    {pmList.length > 0 ? pmList.length : 0}
                  </span>
                  <span className="font-body-sm text-body-sm text-primary font-semibold">
                    {pmList.length > 0 ? '1 Selesai • 1 Berjalan' : 'tugas terdaftar'}
                  </span>
                </div>
              </div>

              {/* Card 2: Teknisi Terhubung */}
              <div className="p-5 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col justify-between border border-outline-variant/20 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    Teknisi Terhubung
                  </span>
                  <span className="p-2 rounded-DEFAULT bg-surface-container-low text-primary">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold">
                    {pmList.length > 0 ? 14 : 0}
                  </span>
                  <span className="font-body-sm text-body-sm text-outline">staf aktif lapangan</span>
                </div>
              </div>

              {/* Card 3: Struktur Wilayah */}
              <div className="p-5 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col justify-between border border-outline-variant/20 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    Struktur Wilayah
                  </span>
                  <span className="p-2 rounded-DEFAULT bg-surface-container-low text-secondary">
                    <span className="material-symbols-outlined text-[18px]">domain</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold">
                    {pmList.length > 0 ? 3 : '--'}
                  </span>
                  <span className="font-body-sm text-body-sm text-outline">
                    {pmList.length > 0 ? 'Medan, Jkt, Sby' : 'belum dikonfigurasi'}
                  </span>
                </div>
              </div>

              {/* Card 4: Status Penyelesaian Tugas */}
              <div className="p-5 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col justify-between border border-outline-variant/20 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    Status penyelesaian tugas
                  </span>
                  <span className="p-2 rounded-DEFAULT bg-surface-container-low text-secondary">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-extrabold">100%</span>
                  <span className="font-body-sm text-body-sm text-outline">standar node siap</span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION: DAFTAR PM / EMPTY STATE */}
            {/* ========================================================================= */}
            {pmList.length === 0 ? (
              /* EMPTY STATE CARD (Matching Image 2) */
              <div className="w-full rounded-DEFAULT bg-surface-container-lowest shadow-xs border border-outline-variant/30 py-16 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-surface-container-high/60 flex items-center justify-center text-secondary mb-4">
                  <span className="material-symbols-outlined text-[36px]">checklist_rtl</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">Belum ada aktivitas</h3>
                <p className="text-sm text-secondary max-w-md mb-6 leading-relaxed">
                  Kelola operasional dan mulai buat pekerjaan pertama Anda, atau atur skema wilayah dan bagikan tautan
                  pendaftaran staf.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveNav('create-jobs')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#091c33] text-white font-label-md text-sm font-semibold hover:bg-primary transition-all cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_task</span>
                    <span>+ Buat Job / Pekerjaan Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkPortalModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-on-surface font-label-md text-sm font-semibold hover:bg-surface-container transition-all cursor-pointer"
                  >
                    <span>Atur Link & Struktur Portal →</span>
                  </button>
                </div>
                <div className="mt-8 pt-6 border-t border-outline-variant/20 flex items-center gap-4 text-xs text-outline">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Enkripsi Terverifikasi
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    Sinkronisasi Realtime
                  </span>
                </div>
              </div>
            ) : (
              /* POPULATED PM TABLE & DETAIL DRAWER (Matching Image 1) */
              <section className="w-full rounded-DEFAULT bg-surface-container-lowest shadow-xs overflow-hidden border border-outline-variant/30 flex flex-col">
                {/* Section Header */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 bg-surface-container-low/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-DEFAULT bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">event_repeat</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                          Daftar PM Sedang Dikerjakan
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm flex items-center gap-1.5 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                          1 Berjalan • 1 Selesai
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                        Klik baris atau judul PM untuk melihat panel detail progres instan di bawah. Gunakan 4 tombol aksi
                        di kanan untuk kontrol penuh.
                      </p>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        aria-label="Filter Region"
                        value={selectedRegionFilter}
                        onChange={(e) => setSelectedRegionFilter(e.target.value)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 text-secondary text-body-sm outline-none cursor-pointer"
                      >
                        <option value="Semua Region">Semua Region</option>
                        <option value="Medan">Medan</option>
                        <option value="Jakarta">Jakarta</option>
                        <option value="Surabaya">Surabaya</option>
                      </select>
                    </div>

                    <button
                      className="p-2 rounded-DEFAULT bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 text-secondary transition-colors cursor-pointer"
                      onClick={() => {
                        triggerBottomToast('Data Disegarkan', 'Pembaruan data checklist lapangan berhasil disinkronkan.');
                      }}
                      title="Segarkan Data"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                    </button>
                  </div>
                </div>

                {/* Table PM */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-6 font-semibold">Nama & Detail PM</th>
                        <th className="py-3.5 px-6 font-semibold">Jadwal & Periode</th>
                        <th className="py-3.5 px-6 font-semibold">Penanggung Jawab</th>
                        <th className="py-3.5 px-6 font-semibold">Status & Progres</th>
                        <th className="py-3.5 px-6 font-semibold text-right min-w-[210px]">Aksi Manajemen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 font-body-md text-body-md">
                      {filteredPms.map((pm) => {
                        const isSelected = selectedPmId === pm.id;
                        return (
                          <tr
                            key={pm.id}
                            id={pm.id}
                            onClick={() => setSelectedPmId(pm.id)}
                            className={`hover:bg-surface-container-low/80 transition-colors group cursor-pointer border-l-4 ${
                              isSelected
                                ? 'border-l-primary bg-primary/5'
                                : 'border-l-transparent'
                            }`}
                          >
                            {/* Nama & Detail PM */}
                            <td className="py-4 px-6">
                              <div className="flex items-start gap-3.5">
                                <div className="p-2 rounded-DEFAULT bg-surface-container-high text-primary shrink-0 mt-0.5">
                                  <span className="material-symbols-outlined text-[20px]">
                                    {pm.progress === 100 ? 'construction' : 'settings_input_component'}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                                      {pm.code}
                                    </span>
                                    {isSelected && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-on-primary">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                        Sedang Dipilih
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-label-lg text-label-lg text-on-surface font-semibold group-hover:text-primary transition-colors">
                                    {pm.title}
                                  </h4>
                                  <p className="font-body-sm text-body-sm text-secondary flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                                      {pm.subStationCount || 12} Lokasi Sub-Stasiun
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">checklist</span>
                                      {pm.totalCount} Item Checklist
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Jadwal & Periode */}
                            <td className="py-4 px-6 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                                    calendar_today
                                  </span>
                                  {pm.dates}
                                </span>
                                <span className="font-body-sm text-body-sm text-secondary mt-0.5">
                                  {pm.progress === 100 ? 'Sisa 14 Hari Kalender' : 'Sisa 6 Hari Kalender'}
                                </span>
                              </div>
                            </td>

                            {/* Penanggung Jawab */}
                            <td className="py-4 px-6 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-label-sm font-bold text-label-sm ring-1 ring-primary/30">
                                  {pm.recentLog.avatar}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold">
                                    {pm.pic}
                                  </span>
                                  <span className="font-body-sm text-body-sm text-secondary">
                                    {pm.picRole}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Status & Progres */}
                            <td className="py-4 px-6 whitespace-nowrap">
                              <div className="flex flex-col gap-1.5 min-w-[130px]">
                                <div className="flex items-center justify-between text-body-sm">
                                  {pm.progress === 100 ? (
                                    <span className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm font-semibold">
                                      <span className="material-symbols-outlined text-[15px] text-primary">
                                        check_circle
                                      </span>
                                      Selesai&nbsp;
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                      Sedang Berjalan
                                    </span>
                                  )}
                                  <span className="font-label-sm text-label-sm text-primary font-bold">
                                    {pm.progress}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${pm.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>

                            {/* Aksi Manajemen */}
                            <td
                              className="py-4 px-6 whitespace-nowrap text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1 bg-surface-container-low p-1 rounded-DEFAULT border border-outline-variant/30 shadow-xs">
                                {/* Export Excel Button (Always visible on 100% finished or available) */}
                                {pm.progress === 100 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleExportExcel(pm)}
                                      title="Export Laporan ke Excel (.xlsx)"
                                      className="relative group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-DEFAULT bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary text-label-sm font-semibold transition-all shadow-xs cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">download</span>
                                      <span className="btn-text">Export Excel</span>
                                    </button>
                                    <div className="w-[1px] h-4 bg-outline-variant/40 mx-0.5"></div>
                                  </>
                                )}

                                {/* 1. Monitoring */}
                                <button
                                  className="relative group/btn p-2 rounded hover:bg-surface-container-highest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer"
                                  onClick={() => {
                                    setModalTargetPm(pm);
                                    setIsMonitoringOpen(true);
                                  }}
                                  title="Monitoring Progres PM"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[19px]">desktop_windows</span>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-inverse-surface text-inverse-on-surface text-[10px] font-semibold px-2 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 shadow-md">
                                    Monitoring
                                  </span>
                                </button>

                                {/* 2. View Config */}
                                <button
                                  className="relative group/btn p-2 rounded hover:bg-surface-container-highest text-secondary hover:text-on-surface transition-all flex items-center justify-center cursor-pointer"
                                  onClick={() => {
                                    setModalTargetPm(pm);
                                    setIsViewConfigOpen(true);
                                  }}
                                  title="Konfigurasi PM"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[19px]">visibility</span>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-inverse-surface text-inverse-on-surface text-[10px] font-semibold px-2 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 shadow-md">
                                    Lihat Konfigurasi
                                  </span>
                                </button>

                                {/* 3. Edit Config */}
                                <button
                                  className="relative group/btn p-2 rounded hover:bg-surface-container-highest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer"
                                  onClick={() => handleOpenEditModal(pm, false)}
                                  title="Edit Konfigurasi PM"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[19px]">edit_note</span>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-inverse-surface text-inverse-on-surface text-[10px] font-semibold px-2 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 shadow-md">
                                    Edit Konfigurasi
                                  </span>
                                </button>

                                <div className="w-[1px] h-4 bg-outline-variant/40 mx-0.5"></div>

                                {/* 4. Delete PM */}
                                <button
                                  className="relative group/btn p-2 rounded hover:bg-error-container text-error transition-all flex items-center justify-center cursor-pointer"
                                  onClick={() => handleOpenDeleteModal(pm)}
                                  title="Hapus Pekerjaan PM (Konfirmasi Ganda)"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[19px]">delete</span>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-error text-on-error text-[10px] font-semibold px-2 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 shadow-md">
                                    Hapus PM
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ========================================================================= */}
                {/* DETAIL PROGRES PANEL (EXPANDED ON CLICKING ROW) */}
                {/* ========================================================================= */}
                {currentSelectedPm && (
                  <div className="border-t-2 border-primary/20 bg-surface-container-low/40 p-6 flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-full bg-primary text-on-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px]">analytics</span>
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-label-sm text-label-sm uppercase font-bold text-primary tracking-wider">
                              Panel Detail Progres Interaktif
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-semibold">
                              {currentSelectedPm.code}
                            </span>
                          </div>
                          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                            {currentSelectedPm.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentSelectedPm.progress === 100 && (
                          <button
                            type="button"
                            onClick={() => handleExportExcel(currentSelectedPm)}
                            disabled={isExporting}
                            className="px-3.5 py-1.5 rounded-DEFAULT bg-primary text-on-primary hover:bg-primary-container text-label-md font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            <span>{isExporting ? 'Mengunduh...' : 'Export to Excel (.xlsx)'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setModalTargetPm(currentSelectedPm);
                            setIsMonitoringOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container text-on-surface text-label-md font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            desktop_windows
                          </span>
                          <span>Buka Monitoring Lengkap</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalTargetPm(currentSelectedPm);
                            setIsViewConfigOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container text-on-surface text-label-md font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px] text-secondary">
                            visibility
                          </span>
                          <span>Lihat Konfigurasi</span>
                        </button>
                      </div>
                    </div>

                    {/* Progres Cards Grid (3 Cards) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Card 1: Status Progres Terkini */}
                      <div className="p-4 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                            Status Progres Terkini
                          </span>
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-label-sm flex items-center gap-1">
                            {currentSelectedPm.progress}% Selesai
                          </span>
                        </div>
                        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${currentSelectedPm.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-body-sm">
                          <span className="text-primary font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              check_circle
                            </span>
                            <span>
                              {currentSelectedPm.doneCount} / {currentSelectedPm.totalCount} Checklist Selesai
                            </span>
                          </span>
                          <span className="text-secondary font-medium">
                            {currentSelectedPm.pendingCount} Sisa Pekerjaan
                          </span>
                        </div>
                      </div>

                      {/* Card 2: Progres Per Lokasi / Wilayah */}
                      <div className="p-4 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                            Progres per Lokasi
                          </span>
                          <span className="text-outline text-body-sm font-medium">
                            {currentSelectedPm.regionsDetail?.length || 3} Wilayah
                          </span>
                        </div>
                        <div className="space-y-2 text-body-sm">
                          {currentSelectedPm.regionsDetail?.map((reg, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between font-label-sm text-[12px] mb-1">
                                <span className="font-medium text-on-surface">{reg.name}</span>
                                <span className="font-bold text-on-surface">{reg.percent}</span>
                              </div>
                              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${reg.color} rounded-full`}
                                  style={{
                                    width: reg.percent.includes('%') ? reg.percent : '100%',
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card 3: Ringkasan Aktivitas Teknisi Terakhir */}
                      <div className="p-4 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                              Aktivitas Teknisi Terakhir
                            </span>
                            <span className="text-[11px] text-tertiary font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping"></span>
                              Live Log
                            </span>
                          </div>
                          <div className="flex items-start gap-3 mt-1">
                            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-label-sm shrink-0">
                              {currentSelectedPm.recentLog?.avatar || 'AS'}
                            </div>
                            <div className="flex flex-col text-body-sm">
                              <p className="font-semibold text-on-surface leading-snug">
                                {currentSelectedPm.recentLog?.name}
                              </p>
                              <p className="text-secondary text-[12px] mt-0.5">
                                {currentSelectedPm.recentLog?.activity}
                              </p>
                              <span className="text-[11px] text-outline mt-1 font-medium">
                                {currentSelectedPm.recentLog?.time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-secondary">
                          <span>PIC: {currentSelectedPm.pic} (Lead)</span>
                          <span
                            onClick={() => {
                              setModalTargetPm(currentSelectedPm);
                              setIsMonitoringOpen(true);
                            }}
                            className="font-semibold text-primary cursor-pointer hover:underline"
                          >
                            Lihat Seluruh Log →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Footer */}
                <div className="p-4 bg-surface-container-low/40 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span>Sinkronisasi otomatis dengan portal aplikasi mobile teknisi lapangan aktif.</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-label-sm text-label-sm text-outline">
                      Menampilkan {filteredPms.length} dari {pmList.length} penugasan aktif
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        triggerBottomToast('Riwayat Penugasan', 'Membuka arsip riwayat penugasan PM sebelumnya.')
                      }
                      className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka Riwayat Lengkap</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* SECTION: PANDUAN MEMULAI CEPAT (ONBOARDING) */}
            {/* ========================================================================= */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-label-lg text-label-lg text-on-surface tracking-tight font-bold">
                  Panduan Memulai Cepat (Onboarding)
                </h3>
                <span className="font-body-sm text-body-sm text-secondary font-medium">
                  3 Langkah Menuju Operasional Penuh
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1: Konfigurasi Link Portal */}
                <div
                  onClick={() => setActiveNav('link-portal')}
                  className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col justify-between hover:shadow-md transition-all group border border-outline-variant/20 cursor-pointer"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors font-bold">
                        1
                      </span>
                      <span className="font-body-sm text-body-sm text-primary font-semibold">
                        {pmList.length > 0 ? '1 Selesai • 1 Berjalan' : 'Siap diatur'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-label-lg text-label-lg text-on-surface font-bold">
                        Konfigurasi Link Portal
                      </h4>
                      <p className="font-body-md text-body-md text-secondary">
                        Tentukan skema hierarki kerja (Wilayah & Cabang atau Lokasi saja) dan salin tautan pendaftaran
                        staf.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 flex items-center justify-between border-t border-outline-variant/20">
                    <span className="font-label-sm text-label-sm text-outline font-medium">
                      Langkah Registrasi Struktur
                    </span>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[20px]">
                      chevron_right
                    </span>
                  </div>
                </div>

                {/* Step 2: Daftarkan Tim & Teknisi */}
                <div
                  onClick={() => setActiveNav('link-portal')}
                  className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col justify-between hover:shadow-md transition-all group border border-outline-variant/20 cursor-pointer"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors font-bold">
                        2
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-semibold">
                        Menunggu staf
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-label-lg text-label-lg text-on-surface font-bold">
                        Daftarkan Tim & Teknisi
                      </h4>
                      <p className="font-body-md text-body-md text-secondary">
                        Bagikan tautan portal unik kepada petugas lapangan untuk bergabung ke kantor cabang masing-masing.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 flex items-center justify-between border-t border-outline-variant/20">
                    <span className="font-label-sm text-label-sm text-outline font-medium">
                      Akses Mandiri Staf
                    </span>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[20px]">
                      chevron_right
                    </span>
                  </div>
                </div>

                {/* Step 3: Rancang Checklist & Jadwal PM */}
                <div
                  onClick={() => setActiveNav('create-jobs')}
                  className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col justify-between hover:shadow-md transition-all group border border-outline-variant/20 cursor-pointer"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors font-bold">
                        3
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
                        {pmList.length > 0 ? 'Templat PM' : '0 Pekerjaan Aktif'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-label-lg text-label-lg text-on-surface font-bold">
                        Rancang Checklist & Jadwal PM
                      </h4>
                      <p className="font-body-md text-body-md text-secondary">
                        Buat penugasan preventif maintenance lengkap dengan lampiran foto bukti dan opsi checklist verifikasi.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 flex items-center justify-between border-t border-outline-variant/20">
                    <span className="font-label-sm text-label-sm text-outline font-medium">
                      Templat Inspeksi
                    </span>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-[20px]">
                      chevron_right
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: MONITORING PROGRES PM */}
      {/* ========================================================================= */}
      {isMonitoringOpen && modalTargetPm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-surface-container-lowest rounded-DEFAULT shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">desktop_windows</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
                      Monitoring Progres PM Lapangan
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-label-sm font-semibold">
                      {modalTargetPm.code}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    {modalTargetPm.title}
                  </p>
                </div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                onClick={() => setIsMonitoringOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant/20 flex flex-col">
                  <span className="font-label-sm text-[11px] text-secondary uppercase font-semibold">
                    Total Item Checklist
                  </span>
                  <span className="font-headline-lg text-headline-lg text-on-surface font-bold">
                    {modalTargetPm.totalCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant/20 flex flex-col">
                  <span className="font-label-sm text-[11px] text-secondary uppercase font-semibold">
                    Telah Selesai (Verified)
                  </span>
                  <span className="font-headline-lg text-headline-lg text-primary font-bold">
                    {modalTargetPm.doneCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant/20 flex flex-col">
                  <span className="font-label-sm text-[11px] text-secondary uppercase font-semibold">
                    Pending / In-Progress
                  </span>
                  <span className="font-headline-lg text-headline-lg text-tertiary font-bold">
                    {modalTargetPm.pendingCount}
                  </span>
                </div>
                <div className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant/20 flex flex-col">
                  <span className="font-label-sm text-[11px] text-secondary uppercase font-semibold">
                    Lead Teknisi (PIC)
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-bold truncate mt-1">
                    {modalTargetPm.pic}
                  </span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold">
                    Semua Wilayah
                  </span>
                  <span className="px-3 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm">
                    Medan
                  </span>
                  <span className="px-3 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm">
                    Jakarta
                  </span>
                  <span className="px-3 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm">
                    Surabaya
                  </span>
                </div>
                <span className="text-body-sm text-secondary font-medium">
                  Real-time Sinyal GPS & Sinkronisasi Foto
                </span>
              </div>

              {/* Task Checklist Matrix */}
              <div className="space-y-3">
                <div className="p-4 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-label-md text-label-md text-on-surface font-bold">
                          1. Kalibrasi Suhu Transformator & Pengecekan Oli Isolasi
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[11px] font-bold uppercase">
                          Selesai
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary mt-1">
                        Wilayah: <strong>Belum ada data wilayah</strong> • PIC Pelaksana: <strong>Belum ditentukan</strong>
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[12px] text-on-surface-variant font-medium">
                        <span className="flex items-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-[16px]">photo_camera</span> 3 Foto Bukti Terunggah
                        </span>
                        <span>•</span>
                        <span>Nilai: 41.2°C (Normal)</span>
                        <span>•</span>
                        <span className="text-secondary">Diselesaikan: Hari ini, 09:30 WIB</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      triggerBottomToast('Pratinjau Foto Bukti', 'Foto meter oli dan termometer inframerah terlampir lengkap.')
                    }
                    className="px-3 py-1.5 rounded-DEFAULT bg-surface-container text-on-surface hover:bg-surface-container-high text-label-sm font-semibold flex items-center gap-1 self-start md:self-auto transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    <span>Lihat Bukti Foto</span>
                  </button>
                </div>

                <div className="p-4 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-label-md text-label-md text-on-surface font-bold">
                          2. Pemeriksaan Kontak Sakelar Pemutus Daya (Circuit Breaker)
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[11px] font-bold uppercase">
                          Selesai
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary mt-1">
                        Wilayah: <strong>Belum ada data wilayah</strong> • PIC Pelaksana: <strong>Belum ditentukan</strong>
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[12px] text-on-surface-variant font-medium">
                        <span className="flex items-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-[16px]">photo_camera</span> 2 Foto Bukti Terunggah
                        </span>
                        <span>•</span>
                        <span>Status: Baik / Layak Operasi</span>
                        <span>•</span>
                        <span className="text-secondary">Diselesaikan: Kemarin, 16:15 WIB</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      triggerBottomToast('Pratinjau Foto Bukti', 'Kondisi kontak breaker bersih tanpa kerak korosi.')
                    }
                    className="px-3 py-1.5 rounded-DEFAULT bg-surface-container text-on-surface hover:bg-surface-container-high text-label-sm font-semibold flex items-center gap-1 self-start md:self-auto transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    <span>Lihat Bukti Foto</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-low flex items-center justify-between border-t border-outline-variant/20">
              <div className="flex items-center gap-2 text-body-sm text-secondary">
                <span className="material-symbols-outlined text-[18px] text-tertiary">wifi_tethering</span>
                <span>Data diperbarui secara live tiap 30 detik.</span>
              </div>
              <button
                className="px-5 py-2 rounded-DEFAULT bg-surface-container-highest text-on-surface hover:bg-surface-container font-label-md text-label-md font-semibold transition-colors cursor-pointer"
                onClick={() => setIsMonitoringOpen(false)}
                type="button"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KONFIGURASI PM (VIEW) */}
      {/* ========================================================================= */}
      {isViewConfigOpen && modalTargetPm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl bg-surface-container-lowest rounded-DEFAULT shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">visibility</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
                      Konfigurasi Pekerjaan PM
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                      {modalTargetPm.code}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    Rincian parameter operasional, hierarki job title, dan aturan input.
                  </p>
                </div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                onClick={() => setIsViewConfigOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-DEFAULT bg-surface-container-low border border-outline-variant/30">
                <div>
                  <span className="font-label-sm text-secondary uppercase font-semibold text-[11px]">
                    Nama Judul Dokumen PM
                  </span>
                  <p className="font-label-md text-on-surface font-bold mt-0.5">{modalTargetPm.title}</p>
                </div>
                <div>
                  <span className="font-label-sm text-secondary uppercase font-semibold text-[11px]">
                    Periode Pelaksanaan
                  </span>
                  <p className="font-label-md text-on-surface font-bold mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">calendar_today</span>
                    <span>{modalTargetPm.dates}</span>
                  </p>
                </div>
                <div>
                  <span className="font-label-sm text-secondary uppercase font-semibold text-[11px]">
                    Skema & Penugasan Wilayah
                  </span>
                  <p className="font-body-md text-on-surface font-medium mt-0.5">{modalTargetPm.regions}</p>
                </div>
                <div>
                  <span className="font-label-sm text-secondary uppercase font-semibold text-[11px]">
                    PIC Penanggung Jawab
                  </span>
                  <p className="font-body-md text-on-surface font-medium mt-0.5">
                    {modalTargetPm.pic} ({modalTargetPm.picRole})
                  </p>
                </div>
              </div>

              {/* Sub-checklists */}
              <div className="space-y-3">
                <h4 className="font-label-lg text-label-lg text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">format_list_bulleted</span>
                  <span>Daftar Modul & Sub-Tugas Terdaftar ({modalTargetPm.modules?.length || 4} Kategori)</span>
                </h4>
                <div className="border border-outline-variant/30 rounded-DEFAULT divide-y divide-outline-variant/20 overflow-hidden">
                  {(modalTargetPm.modules || []).map((mod, idx) => (
                    <div key={idx} className="p-4 bg-surface-container-lowest">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md font-bold text-on-surface">
                          {idx + 1}. {mod.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-secondary text-[11px] font-semibold">
                          {mod.itemCount} Checklist
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-low flex items-center justify-end gap-3 border-t border-outline-variant/20">
              <button
                className="px-4 py-2 rounded-DEFAULT bg-surface-container-highest text-on-surface hover:bg-surface-container font-label-md text-label-md font-semibold transition-colors cursor-pointer"
                onClick={() => setIsViewConfigOpen(false)}
                type="button"
              >
                Tutup
              </button>
              <button
                className="px-5 py-2 rounded-DEFAULT bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                onClick={() => {
                  setIsViewConfigOpen(false);
                  handleOpenEditModal(modalTargetPm, false);
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Buka Mode Edit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT / BUAT KONFIGURASI PM */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl bg-surface-container-lowest rounded-DEFAULT shadow-2xl border border-outline-variant/30 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">edit_document</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
                    {isCreatingNew ? 'Buat Konfigurasi Penugasan PM Baru' : `Edit Konfigurasi PM (${modalTargetPm?.code})`}
                  </h3>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    Sesuaikan judul, rentang tanggal, wilayah kerja, dan susunan sub-tugas penugasan.
                  </p>
                </div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                onClick={() => setIsEditModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePm} className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Nama Judul PM <span className="text-error">*</span>
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-on-surface transition-colors"
                    required
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Contoh: PM Oktober 2026 - Pemeliharaan Trafo Gardu"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                      Tanggal Mulai <span className="text-error">*</span>
                    </label>
                    <input
                      className="w-full px-3.5 py-2 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-on-surface"
                      required
                      type="date"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                      Tanggal Selesai <span className="text-error">*</span>
                    </label>
                    <input
                      className="w-full px-3.5 py-2 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-on-surface"
                      required
                      type="date"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                      Wilayah Operasional <span className="text-error">*</span>
                    </label>
                    <input
                      className="w-full px-3.5 py-2 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-on-surface"
                      required
                      type="text"
                      value={editRegions}
                      onChange={(e) => setEditRegions(e.target.value)}
                      placeholder="Contoh: Medan, Jakarta, Surabaya"
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                      Penanggung Jawab (PIC Lead) <span className="text-error">*</span>
                    </label>
                    <input
                      className="w-full px-3.5 py-2 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-on-surface cursor-pointer"
                      value={editPic}
                      onChange={(e) => setEditPic(e.target.value)}
                      placeholder="Masukkan PIC dari data nyata"
                      type="text"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Modules list */}
              <div className="space-y-3 pt-2 border-t border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-label-lg text-label-lg text-on-surface font-bold">
                      Rincian Modul Pekerjaan & Sub-Tugas
                    </h4>
                    <p className="font-body-sm text-body-sm text-secondary">
                      Tambah atau kurangi modul tugas inspeksi preventif.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModules([...editModules, { name: 'Modul Baru Inspeksi', itemCount: 8 }]);
                    }}
                    className="px-3 py-1.5 rounded-DEFAULT bg-primary/10 text-primary hover:bg-primary/20 font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Tambah Modul Job</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editModules.map((mod, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 rounded-DEFAULT bg-surface-container-low border border-outline-variant/30"
                    >
                      <span className="material-symbols-outlined text-outline text-[18px]">drag_indicator</span>
                      <input
                        type="text"
                        value={mod.name}
                        onChange={(e) => {
                          const updated = [...editModules];
                          updated[idx].name = e.target.value;
                          setEditModules(updated);
                        }}
                        className="flex-1 bg-surface-container-lowest px-3 py-1.5 rounded border border-outline-variant/30 text-body-md text-on-surface focus:border-primary outline-none"
                        required
                      />
                      <span className="text-body-sm text-secondary whitespace-nowrap">{mod.itemCount} Item</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditModules(editModules.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 rounded text-outline hover:text-error hover:bg-error-container/40 transition-colors cursor-pointer"
                        title="Hapus modul ini"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="p-4 -mx-6 -mb-6 bg-surface-container-low flex items-center justify-between border-t border-outline-variant/20">
                <span className="text-body-sm text-secondary">
                  Perubahan akan langsung disinkronkan ke perangkat tim lapangan.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-DEFAULT bg-surface-container-highest text-on-surface hover:bg-surface-container font-label-md text-label-md font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-DEFAULT bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Simpan Konfigurasi PM</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: HAPUS PM (DOUBLE VERIFICATION) */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && modalTargetPm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-DEFAULT shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">warning</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface leading-tight font-bold">
                      Hapus Penugasan PM?
                    </h3>
                    <span className="font-label-sm text-label-sm text-error font-bold uppercase tracking-wider">
                      Double Verification Required
                    </span>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                  onClick={() => setIsDeleteModalOpen(false)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-secondary">Target Pekerjaan:</span>
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  {modalTargetPm.title}
                </p>
              </div>

              <p className="font-body-md text-body-md text-secondary leading-relaxed">
                Tindakan ini akan <strong>menghapus permanen</strong> data penugasan PM, checklist yang sedang dikerjakan
                staf, serta log bukti inspeksi terkait dari server MAJO. Tindakan ini{' '}
                <span className="text-error font-semibold">tidak dapat dibatalkan</span>.
              </p>

              <div className="pt-2 border-t border-outline-variant/20">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-DEFAULT bg-surface-container-low/70 hover:bg-surface-container transition-colors border border-outline-variant/30">
                  <input
                    type="checkbox"
                    checked={deleteAcknowledged}
                    onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-error border-outline focus:ring-error cursor-pointer"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface font-medium leading-snug">
                    Saya mengerti risiko penghapusan data pekerjaan PM ini dan ingin melanjutkan.
                  </span>
                </label>
              </div>
            </div>

            <div className="p-4 bg-surface-container-low flex items-center justify-end gap-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-DEFAULT bg-surface-container-highest text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md font-semibold cursor-pointer"
              >
                Batal / Urungkan
              </button>
              <button
                type="button"
                disabled={!deleteAcknowledged}
                onClick={handleExecuteDelete}
                className={`px-5 py-2 rounded-DEFAULT bg-error text-on-error transition-all font-label-md text-label-md flex items-center gap-1.5 shadow-xs font-semibold ${
                  deleteAcknowledged ? 'cursor-pointer hover:bg-red-700' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SETUP LINK PORTAL */}
      {/* ========================================================================= */}
      {isLinkPortalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-DEFAULT shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">hub</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
                    Setup Link Portal & Delegasi
                  </h3>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    Tautan pendaftaran mandiri teknisi lapangan terhubung.
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                onClick={() => setIsLinkPortalModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-DEFAULT bg-surface-container-low border border-outline-variant/30 space-y-2">
                <span className="text-xs font-bold text-on-surface uppercase">Tautan Registrasi Staf Lapangan</span>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    type="text"
                    value="https://majo-portal.internal/register?ref=region-central"
                    className="flex-1 px-3 py-2 text-xs bg-surface-container-lowest rounded border border-outline-variant/30 text-on-surface font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('https://majo-portal.internal/register?ref=region-central');
                      triggerBottomToast('Tautan Disalin', 'Tautan registrasi telah disalin ke clipboard Anda.');
                    }}
                    className="px-3 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container cursor-pointer"
                  >
                    Salin
                  </button>
                </div>
                <p className="text-[11px] text-secondary">
                  Teknisi yang mendaftar melalui tautan ini akan langsung otomatis masuk ke hierarki Region Central Anda.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-on-surface">Skema Wilayah Aktif</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                    <p className="font-bold text-on-surface">Medan</p>
                    <p className="text-[10px] text-secondary">4 Sub-Stasiun</p>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                    <p className="font-bold text-on-surface">Jakarta</p>
                    <p className="text-[10px] text-secondary">5 Sub-Stasiun</p>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                    <p className="font-bold text-on-surface">Surabaya</p>
                    <p className="text-[10px] text-secondary">3 Sub-Stasiun</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-container-low flex justify-end border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsLinkPortalModalOpen(false)}
                className="px-5 py-2 rounded-DEFAULT bg-primary text-on-primary text-xs font-semibold cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PENGATURAN / PROFILE MODAL */}
      {/* ========================================================================= */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-DEFAULT shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
                    Pengaturan Akun & Profil
                  </h3>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    Informasi otorisasi Super Administrator MAJO.
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                onClick={() => setIsProfileModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-DEFAULT bg-surface-container-low border border-outline-variant/30">
                <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center text-xl font-bold">
                  SA
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">{currentUser.name || 'Super Admin'}</h4>
                  <p className="text-xs text-secondary">Username: @{currentUser.username}</p>
                  <p className="text-xs text-secondary">Role: Administrator Utama (Sovereign Node)</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-secondary">
                <div className="flex justify-between py-2 border-b border-outline-variant/20">
                  <span>Enkripsi Node:</span>
                  <span className="font-semibold text-emerald-600">Aktif & Terverifikasi (256-bit)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-outline-variant/20">
                  <span>Status Sesi:</span>
                  <span className="font-semibold text-on-surface">Login Valid</span>
                </div>
                <div className="flex justify-between py-2 border-b border-outline-variant/20">
                  <span>Versi Portal:</span>
                  <span className="font-semibold text-on-surface">Versi 1.1</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-container-low flex items-center justify-between border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(false);
                  onNavigate('login');
                }}
                className="px-4 py-2 rounded-DEFAULT bg-error-container text-error text-xs font-semibold hover:bg-error hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Keluar dari Akun</span>
              </button>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2 rounded-DEFAULT bg-surface-container-highest text-on-surface text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOAST 1: TOP-RIGHT EXCEL EXPORT NOTIFICATION */}
      {/* ========================================================================= */}
      {exportToast.show && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3.5 p-4 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 text-on-surface shadow-2xl max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">download_done</span>
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md font-bold text-on-surface">File Excel Berhasil Diunduh!</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary text-on-primary uppercase">.xlsx</span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary leading-snug mt-0.5">{exportToast.message}</p>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/20 text-[11px] text-primary font-semibold">
              <span className="material-symbols-outlined text-[14px]">task_alt</span>
              <span>Otomatis tersimpan di folder Unduhan</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOAST 2: BOTTOM-RIGHT GENERAL NOTIFICATION */}
      {/* ========================================================================= */}
      {bottomToast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-DEFAULT bg-inverse-surface text-inverse-on-surface shadow-xl animate-in slide-in-from-bottom-4 duration-300">
          <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">{bottomToast.icon}</span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-semibold">{bottomToast.title}</span>
            <span className="font-body-sm text-body-sm text-outline-variant">{bottomToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
