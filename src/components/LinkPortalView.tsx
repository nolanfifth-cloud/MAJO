import React, { useState, useMemo, useEffect } from 'react';
import { RegionConfig, StaffResetRequest } from '../types';
import { getPortalConfig, savePortalConfig } from '../services/workflowStore';
import { hasRealPortalLocation, loadPortalConfigFromFirestore, savePortalConfigToFirestore } from '../services/firestoreStore';

interface LinkPortalViewProps {
  onNavigateToDashboard?: () => void;
  onNavigateToCreateJobs?: () => void;
  onConfigurationCompleted?: () => void;
}

const INITIAL_MASTER_LOCATIONS: string[] = [];
const INITIAL_REGIONS: RegionConfig[] = [];
const INITIAL_STAFF_REQUESTS: StaffResetRequest[] = [];

export const LinkPortalView: React.FC<LinkPortalViewProps> = ({
  onNavigateToDashboard,
  onNavigateToCreateJobs,
  onConfigurationCompleted,
}) => {
  // State: Tab & Mode
  const [currentTab, setCurrentTab] = useState<'wilayah' | 'hanya-lokasi'>('wilayah');

  // State: Data
  const [masterLocations, setMasterLocations] = useState<string[]>(INITIAL_MASTER_LOCATIONS);
  const [regions, setRegions] = useState<RegionConfig[]>(INITIAL_REGIONS);
  const [isPortalActivated, setIsPortalActivated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('majo_portal_configured') === 'true';
    } catch {
      return false;
    }
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const hasConfiguredLocation = masterLocations.length > 0 || regions.some((region) => region.locations.length > 0);
  const isPortalReady = isPortalActivated && hasConfiguredLocation;

  useEffect(() => {
    let cancelled = false;
    loadPortalConfigFromFirestore().then((config) => {
      if (!config || cancelled) return;
      setMasterLocations(config.masterWilayah || []);
      setRegions(config.masterGroups || []);
      setIsPortalActivated(Boolean(config.isActivated && hasRealPortalLocation(config)));
    }).catch(() => {
      // Local configuration remains available when the cloud is unreachable.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // State: Master Lokasi Search & Pagination
  const [flatSearchQuery, setFlatSearchQuery] = useState<string>('');
  const [flatCurrentPage, setFlatCurrentPage] = useState<number>(1);
  const flatItemsPerPage = 10;
  const [newFlatLocationInput, setNewFlatLocationInput] = useState<string>('');

  // State: Staff Password Reset Widget
  const [isResetWidgetCollapsed, setIsResetWidgetCollapsed] = useState<boolean>(false);
  const [defaultPassword, setDefaultPassword] = useState<string>('Majo2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [staffRequests, setStaffRequests] = useState<StaffResetRequest[]>(INITIAL_STAFF_REQUESTS);
  const [isResettingStaff, setIsResettingStaff] = useState<boolean>(false);

  // State: Modals
  const [isAddRegionModalOpen, setIsAddRegionModalOpen] = useState<boolean>(false);
  const [newRegionName, setNewRegionName] = useState<string>('');
  const [newRegionInitialBranch, setNewRegionInitialBranch] = useState<string>('');

  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState<boolean>(false);
  const [targetRegionForBranch, setTargetRegionForBranch] = useState<string | null>(null);
  const [searchMasterBranchQuery, setSearchMasterBranchQuery] = useState<string>('');
  const [isQuickMasterInlineOpen, setIsQuickMasterInlineOpen] = useState<boolean>(false);
  const [directMasterInput, setDirectMasterInput] = useState<string>('');

  // Double Verification Delete Modal State
  const [doubleDeleteConfig, setDoubleDeleteConfig] = useState<{
    isOpen: boolean;
    type: 'region' | 'branch' | 'flatLocation';
    regionId?: string;
    branchIndex?: number;
    branchName?: string;
    flatIndex?: number;
    locName?: string;
    displayName: string;
    categoryBadge: string;
    modalTitle: string;
    riskDesc: string;
    confirmed: boolean;
  }>({
    isOpen: false,
    type: 'region',
    displayName: '',
    categoryBadge: '',
    modalTitle: '',
    riskDesc: '',
    confirmed: false,
  });

  // Schema Guide Modal State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Toast State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info' | 'copy';
  }>({
    show: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: 'success' | 'info' | 'copy' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  // Total active branches across regions
  const totalRegionBranchesCount = useMemo(() => {
    return regions.reduce((acc, r) => acc + (r.locations ? r.locations.length : 0), 0);
  }, [regions]);

  // Filtered Flat Locations
  const filteredFlatLocations = useMemo(() => {
    if (!flatSearchQuery.trim()) return masterLocations;
    return masterLocations.filter((loc) =>
      loc.toLowerCase().includes(flatSearchQuery.toLowerCase().trim())
    );
  }, [masterLocations, flatSearchQuery]);

  const totalFlatPages = Math.ceil(filteredFlatLocations.length / flatItemsPerPage) || 1;

  const currentFlatLocations = useMemo(() => {
    const start = (flatCurrentPage - 1) * flatItemsPerPage;
    return filteredFlatLocations.slice(start, start + flatItemsPerPage);
  }, [filteredFlatLocations, flatCurrentPage, flatItemsPerPage]);

  // Copy Link to Clipboard
  const handleCopyLink = () => {
    if (!isPortalReady) {
      showToast('Tautan terkunci! Tambahkan minimal 1 lokasi lalu simpan konfigurasi portal terlebih dahulu.', 'info');
      return;
    }
    const url = 'portal.majo.id/org/pt-majo-logistik-indo';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast('Tautan pendaftaran berhasil disalin ke clipboard!', 'copy');
  };

  // Save / Activate Portal
  const handleSavePortal = () => {
    if (!hasConfiguredLocation) {
      setIsPortalActivated(false);
      showToast('Belum dapat diaktifkan. Tambahkan minimal 1 lokasi operasional terlebih dahulu.', 'info');
      return;
    }
    setIsSaving(true);
    setTimeout(async () => {
      setIsSaving(false);
      setIsPortalActivated(true);
      try {
        const currentConfig = getPortalConfig();
        savePortalConfig({
          ...currentConfig,
          portalAddress: currentConfig.portalAddress,
          portalLink: currentConfig.portalLink,
          isActivated: true,
          masterWilayah: masterLocations,
          masterGroups: regions,
        });
        await savePortalConfigToFirestore({
          ...currentConfig,
          isActivated: true,
          masterWilayah: masterLocations,
          masterGroups: regions,
        });
        localStorage.setItem('majo_portal_configured', 'true');
      } catch {
        // Ignore
      }
      if (onConfigurationCompleted) {
        onConfigurationCompleted();
      }
      showToast('Struktur organisasi berhasil disimpan dan Link Portal aktif!', 'success');
    }, 600);
  };

  // Add Flat Location
  const handleAddFlatLocation = () => {
    const val = newFlatLocationInput.trim();
    if (!val) return;
    if (masterLocations.some((l) => l.toLowerCase() === val.toLowerCase())) {
      showToast(`Lokasi "${val}" sudah ada di Master Data`, 'info');
      return;
    }
    setMasterLocations((prev) => [val, ...prev]);
    setNewFlatLocationInput('');
    setFlatCurrentPage(1);
    showToast(`Lokasi baru "${val}" ditambahkan ke Master Data`, 'success');
  };

  // Add Region
  const handleAddRegionSubmit = () => {
    const rName = newRegionName.trim();
    const bName = newRegionInitialBranch.trim();

    if (!rName) return;

    const locs: string[] = [];
    if (bName) {
      locs.push(bName);
      if (!masterLocations.includes(bName)) {
        setMasterLocations((prev) => [bName, ...prev]);
      }
    }

    const newRegion: RegionConfig = {
      id: `sor_${Date.now()}`,
      name: rName,
      locations: locs,
    };

    setRegions((prev) => [...prev, newRegion]);
    setNewRegionName('');
    setNewRegionInitialBranch('');
    setIsAddRegionModalOpen(false);
    showToast(`Wilayah baru "${rName}" berhasil dibuat!`, 'success');
  };

  // Open Add Branch Modal for a Region
  const handleOpenAddBranch = (regionId: string) => {
    setTargetRegionForBranch(regionId);
    setSearchMasterBranchQuery('');
    setDirectMasterInput('');
    setIsQuickMasterInlineOpen(false);
    setIsAddBranchModalOpen(true);
  };

  const handleChooseBranchForRegion = (branchName: string) => {
    if (!targetRegionForBranch) return;
    setRegions((prev) =>
      prev.map((r) => {
        if (r.id === targetRegionForBranch) {
          if (!r.locations.includes(branchName)) {
            return { ...r, locations: [...r.locations, branchName] };
          }
        }
        return r;
      })
    );
    showToast(`Lokasi "${branchName}" ditambahkan ke wilayah!`, 'success');
    setIsAddBranchModalOpen(false);
  };

  const handleDirectMasterRegister = () => {
    const val = directMasterInput.trim();
    if (!val) return;
    if (!masterLocations.includes(val)) {
      setMasterLocations((prev) => [val, ...prev]);
    }
    handleChooseBranchForRegion(val);
    setDirectMasterInput('');
  };

  // Double Verification Delete Helpers
  const requestDeleteRegion = (regionId: string) => {
    const reg = regions.find((r) => r.id === regionId);
    if (!reg) return;
    setDoubleDeleteConfig({
      isOpen: true,
      type: 'region',
      regionId,
      displayName: reg.name,
      categoryBadge: 'HAPUS WILAYAH OPERASI',
      modalTitle: `Hapus Grup Wilayah: ${reg.name}?`,
      riskDesc: `Seluruh cabang (${reg.locations.length} titik) di bawah ${reg.name} akan dilepas dari hierarki registrasi Link Portal staf.`,
      confirmed: false,
    });
  };

  const requestDeleteBranchFromRegion = (regionId: string, branchIndex: number) => {
    const reg = regions.find((r) => r.id === regionId);
    if (!reg || !reg.locations[branchIndex]) return;
    const branchName = reg.locations[branchIndex];
    setDoubleDeleteConfig({
      isOpen: true,
      type: 'branch',
      regionId,
      branchIndex,
      branchName,
      displayName: `${branchName} (${reg.name})`,
      categoryBadge: 'HAPUS TITIK PENUGASAN',
      modalTitle: `Hapus Titik Lokasi: ${branchName}?`,
      riskDesc: `Titik cabang ini akan dihilangkan dari opsi penempatan wilayah ${reg.name} pada portal onboarding calon staf.`,
      confirmed: false,
    });
  };

  const requestDeleteFlatLocation = (locName: string) => {
    setDoubleDeleteConfig({
      isOpen: true,
      type: 'flatLocation',
      locName,
      displayName: locName,
      categoryBadge: 'HAPUS MASTER LOKASI',
      modalTitle: `Hapus Titik Lokasi: ${locName}?`,
      riskDesc: `Menghapus master lokasi ini akan secara otomatis melepas referensi titik lokasi ini dari seluruh klaster wilayah (SOR) yang terhubung.`,
      confirmed: false,
    });
  };

  const handleExecuteDoubleDelete = () => {
    if (!doubleDeleteConfig.confirmed) return;

    if (doubleDeleteConfig.type === 'region' && doubleDeleteConfig.regionId) {
      const regId = doubleDeleteConfig.regionId;
      setRegions((prev) => prev.filter((r) => r.id !== regId));
      showToast(`Data "${doubleDeleteConfig.displayName}" berhasil dihapus dari sistem`, 'success');
    } else if (
      doubleDeleteConfig.type === 'branch' &&
      doubleDeleteConfig.regionId !== undefined &&
      doubleDeleteConfig.branchIndex !== undefined
    ) {
      const regId = doubleDeleteConfig.regionId;
      const idx = doubleDeleteConfig.branchIndex;
      setRegions((prev) =>
        prev.map((r) => {
          if (r.id === regId) {
            const nextLocs = [...r.locations];
            nextLocs.splice(idx, 1);
            return { ...r, locations: nextLocs };
          }
          return r;
        })
      );
      showToast(`Titik lokasi "${doubleDeleteConfig.displayName}" berhasil dihapus`, 'success');
    } else if (doubleDeleteConfig.type === 'flatLocation' && doubleDeleteConfig.locName) {
      const targetName = doubleDeleteConfig.locName;
      setMasterLocations((prev) => prev.filter((l) => l !== targetName));
      // Remove from regions as well
      setRegions((prev) =>
        prev.map((r) => ({
          ...r,
          locations: r.locations.filter((l) => l !== targetName),
        }))
      );
      showToast(`Master lokasi "${targetName}" berhasil dihapus`, 'success');
    }

    setDoubleDeleteConfig((prev) => ({ ...prev, isOpen: false, confirmed: false }));
  };

  // Reset to Initial
  const handleResetToInitial = () => {
    setMasterLocations(INITIAL_MASTER_LOCATIONS);
    setRegions(INITIAL_REGIONS);
    setFlatSearchQuery('');
    setFlatCurrentPage(1);
    setIsPortalActivated(false);
    showToast('Struktur wilayah dikembalikan ke konfigurasi awal', 'info');
  };

  // Staff Password Reset Handlers
  const handleToggleSelectAllStaff = (checked: boolean) => {
    setStaffRequests((prev) => prev.map((s) => ({ ...s, selected: checked })));
  };

  const handleToggleStaff = (id: string) => {
    setStaffRequests((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const selectedStaffCount = useMemo(() => {
    return staffRequests.filter((s) => s.selected).length;
  }, [staffRequests]);

  const allStaffSelected = useMemo(() => {
    return staffRequests.length > 0 && staffRequests.every((s) => s.selected);
  }, [staffRequests]);

  const handleExecuteStaffReset = () => {
    if (selectedStaffCount === 0) return;
    setIsResettingStaff(true);
    setTimeout(() => {
      setIsResettingStaff(false);
      setStaffRequests((prev) =>
        prev.map((s) => (s.selected ? { ...s, isReset: true } : s))
      );
      showToast(
        `Kata sandi ${selectedStaffCount} staf berhasil direset ke "${defaultPassword}"!`,
        'success'
      );
    }, 600);
  };

  // Active target region info for Add Branch Modal
  const activeRegionObj = useMemo(() => {
    return regions.find((r) => r.id === targetRegionForBranch);
  }, [regions, targetRegionForBranch]);

  const filteredMasterBranchCandidates = useMemo(() => {
    const q = searchMasterBranchQuery.toLowerCase().trim();
    return masterLocations.filter((loc) => loc.toLowerCase().includes(q));
  }, [masterLocations, searchMasterBranchQuery]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface relative">
      {/* Toast Notification Container */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-DEFAULT shadow-lg pointer-events-auto font-label-md text-[13px] ${
              toast.type === 'success'
                ? 'bg-primary text-on-primary'
                : toast.type === 'copy'
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-inverse-surface text-inverse-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'success'
                ? 'check_circle'
                : toast.type === 'copy'
                ? 'content_paste_check'
                : 'info'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH WILAYAH OPERASI BARU */}
      {/* ========================================================================= */}
      {isAddRegionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-DEFAULT shadow-xl p-6 flex flex-col gap-5 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">add_location</span>
                </div>
                <h3 className="font-headline-md text-[18px] font-bold text-on-surface">
                  Tambah Wilayah Operasi Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRegionModalOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface font-medium">
                  Nama Wilayah Regional (SOR)
                </label>
                <input
                  type="text"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRegionSubmit()}
                  placeholder="Contoh: SOR 3 (Jawa Timur & Bali)"
                  className="px-3.5 py-2.5 rounded-DEFAULT bg-surface-container-low border border-outline/20 text-on-surface font-body-md focus:border-primary outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface font-medium">
                  Lokasi Cabang Perdana <span className="text-outline font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={newRegionInitialBranch}
                  onChange={(e) => setNewRegionInitialBranch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRegionSubmit()}
                  placeholder="Contoh: Surabaya Hub"
                  className="px-3.5 py-2.5 rounded-DEFAULT bg-surface-container-low border border-outline/20 text-on-surface font-body-md focus:border-primary outline-none"
                />
                <span className="text-outline text-[12px]">
                  Lokasi ini akan otomatis didaftarkan pula ke database Master Lokasi jika belum ada.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setIsAddRegionModalOpen(false)}
                className="px-4 py-2.5 rounded-DEFAULT bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddRegionSubmit}
                className="px-5 py-2.5 rounded-DEFAULT bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Simpan Wilayah</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PILIH LOKASI DARI MASTER DATA */}
      {/* ========================================================================= */}
      {isAddBranchModalOpen && activeRegionObj && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-DEFAULT shadow-xl p-6 flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">database</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-headline-md text-[17px] font-bold text-on-surface leading-tight">
                    Pilih Lokasi dari Master Data
                  </h3>
                  <span className="font-body-sm text-[12px] text-outline">
                    Menambahkan ke {activeRegionObj.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-DEFAULT bg-secondary-container/30 border border-secondary-container flex items-start gap-2.5 text-[12px] text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                verified
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-primary">Tersinkronisasi Master Database</span>
                <p className="leading-relaxed">
                  Pilih titik operasional resmi dari Master Lokasi perusahaan untuk menjaga integritas data tanpa
                  duplikasi.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-DEFAULT bg-surface-container-low border border-outline/20 focus-within:border-primary transition-all">
                <span className="material-symbols-outlined text-outline text-[18px]">search</span>
                <input
                  type="text"
                  value={searchMasterBranchQuery}
                  onChange={(e) => setSearchMasterBranchQuery(e.target.value)}
                  placeholder="Cari nama lokasi dari Master Data..."
                  className="w-full bg-transparent border-none outline-none font-body-sm text-[13px] text-on-surface placeholder:text-outline"
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider font-bold">
                  Lokasi Tersedia di Master
                </span>
                <span className="font-label-sm text-[11px] text-primary font-semibold">
                  {
                    filteredMasterBranchCandidates.filter(
                      (l) => !activeRegionObj.locations.includes(l)
                    ).length
                  }{' '}
                  Tersedia
                </span>
              </div>

              {/* Scrollable Candidates List */}
              <div className="custom-scrollbar flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {filteredMasterBranchCandidates.length === 0 ? (
                  <div className="p-4 text-center text-outline text-body-sm bg-surface-container-low rounded-DEFAULT">
                    Tidak ada lokasi cocok "{searchMasterBranchQuery}". Anda dapat mendaftarkannya di bawah.
                  </div>
                ) : (
                  filteredMasterBranchCandidates.map((loc) => {
                    const alreadyInRegion = activeRegionObj.locations.includes(loc);
                    return (
                      <div
                        key={loc}
                        onClick={() => {
                          if (!alreadyInRegion) handleChooseBranchForRegion(loc);
                        }}
                        className={`p-2.5 px-3 rounded-DEFAULT flex items-center justify-between transition-all ${
                          alreadyInRegion
                            ? 'bg-surface-container-low opacity-60 cursor-not-allowed'
                            : 'bg-surface-container-lowest hover:bg-secondary-container/40 border border-outline/10 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              alreadyInRegion ? 'text-outline' : 'text-primary'
                            }`}
                          >
                            location_on
                          </span>
                          <span className="font-label-md text-label-md text-on-surface truncate">
                            {loc}
                          </span>
                        </div>
                        <div>
                          {alreadyInRegion ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-outline font-semibold px-2 py-0.5 rounded bg-surface-container">
                              <span className="material-symbols-outlined text-[13px]">check</span>
                              Terdaftar
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-sm text-[12px] font-semibold transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                              <span>Pilih</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Register to Master */}
              <div className="p-3 rounded-DEFAULT bg-surface-container-low border border-dashed border-outline/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-[18px]">help_outline</span>
                  <span className="text-[12px] text-on-surface-variant font-medium">
                    Lokasi belum terdaftar?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickMasterInlineOpen(!isQuickMasterInlineOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest hover:bg-secondary-container text-primary font-label-sm text-[11px] font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>Daftarkan ke Master</span>
                </button>
              </div>

              {isQuickMasterInlineOpen && (
                <div className="flex flex-col gap-2 p-3 rounded-DEFAULT bg-surface-container-low border border-outline/30 animate-in fade-in duration-150">
                  <label className="font-label-sm text-[11px] text-on-surface-variant font-semibold">
                    Nama Lokasi Baru untuk Master Data:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={directMasterInput}
                      onChange={(e) => setDirectMasterInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDirectMasterRegister()}
                      placeholder="Misal: Palembang Depo, Solo Hub"
                      className="flex-1 px-3 py-1.5 rounded-DEFAULT bg-surface-container-lowest border border-outline/20 text-on-surface text-[12px] outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleDirectMasterRegister}
                      className="px-3 py-1.5 rounded-DEFAULT bg-primary text-on-primary font-label-sm text-[12px] font-semibold hover:bg-primary-container shrink-0 transition-all cursor-pointer"
                    >
                      Simpan &amp; Tambahkan
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(false)}
                className="px-4 py-2 rounded-DEFAULT bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DOUBLE VERIFICATION DELETE */}
      {/* ========================================================================= */}
      {doubleDeleteConfig.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-DEFAULT shadow-2xl p-6 flex flex-col gap-5 border border-outline/20">
            {/* Header / Danger Icon Badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[26px] text-error">warning</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-[11px] font-bold text-error uppercase tracking-wider">
                    {doubleDeleteConfig.categoryBadge}
                  </span>
                  <h3 className="font-headline-md text-[18px] font-bold text-on-surface leading-snug">
                    {doubleDeleteConfig.modalTitle}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDoubleDeleteConfig((prev) => ({ ...prev, isOpen: false }))}
                className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Target Entity Highlight Box */}
            <div className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-outline/20 flex flex-col gap-1.5">
              <span className="font-label-sm text-[11px] text-outline uppercase font-semibold">
                Objek Data Yang Akan Dihapus:
              </span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">folder_delete</span>
                <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                  {doubleDeleteConfig.displayName}
                </span>
              </div>
            </div>

            {/* Risk Warning Description */}
            <div className="p-3.5 rounded-DEFAULT bg-error-container/30 border border-error-container flex items-start gap-2.5 text-on-surface">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                shield_with_heart
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-[12px] font-bold text-on-error-container">
                  Tindakan ini tidak dapat dibatalkan
                </span>
                <p className="text-body-sm text-[12.5px] text-on-surface-variant leading-relaxed">
                  {doubleDeleteConfig.riskDesc}
                </p>
              </div>
            </div>

            {/* Double Verification Checkbox Control */}
            <div className="flex flex-col gap-2 pt-1 border-t border-surface-container">
              <label className="flex items-start gap-3 p-3 rounded-DEFAULT bg-surface-container-low/70 hover:bg-surface-container-low border border-outline/20 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={doubleDeleteConfig.confirmed}
                  onChange={(e) =>
                    setDoubleDeleteConfig((prev) => ({ ...prev, confirmed: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-outline/40 text-error focus:ring-error transition-all cursor-pointer"
                />
                <span className="text-body-sm text-[13px] text-on-surface font-medium leading-tight">
                  Saya mengerti risiko penghapusan data ini dan ingin melanjutkan.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDoubleDeleteConfig((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-DEFAULT bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all cursor-pointer"
              >
                Batal / Urungkan
              </button>
              <button
                type="button"
                disabled={!doubleDeleteConfig.confirmed}
                onClick={handleExecuteDoubleDelete}
                className={`px-5 py-2.5 rounded-DEFAULT font-label-md text-label-md inline-flex items-center gap-2 transition-all ${
                  doubleDeleteConfig.confirmed
                    ? 'bg-error hover:bg-[#a51515] text-white cursor-pointer shadow-md'
                    : 'bg-surface-container-highest text-outline/50 cursor-not-allowed shadow-none'
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
      {/* MODAL 4: PANDUAN SKEMA ORGANISASI */}
      {/* ========================================================================= */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-DEFAULT shadow-xl p-6 flex flex-col gap-5 border border-outline-variant/30">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">menu_book</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Panduan Skema Struktur Organisasi
                  </h3>
                  <p className="text-body-sm text-secondary">
                    Pemilihan model arsitektur distribusi cabang untuk portal onboarding staf.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4 text-body-sm text-on-surface-variant leading-relaxed">
              <div className="p-3.5 bg-surface-container-low rounded-DEFAULT border border-outline/10">
                <h4 className="font-bold text-on-surface text-label-md flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                  Mode 1: Wilayah &amp; Lokasi (Dual Hierarchy)
                </h4>
                <p>
                  Cocok untuk perusahaan dengan operasional berskala regional luas (misal: SOR 1 Sumatera, SOR 2
                  Jawa). Staf akan memilih provinsi/wilayah terlebih dahulu sebelum memilih unit cabang penempatan.
                </p>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-DEFAULT border border-outline/10">
                <h4 className="font-bold text-on-surface text-label-md flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-primary text-[18px]">location_city</span>
                  Mode 2: Hanya Lokasi (Flat Single Level)
                </h4>
                <p>
                  Cocok untuk operasional tunggal atau sentralisasi langsung. Calon staf langsung memilih titik unit
                  gudang / kantor kerja dari Master Lokasi tanpa pembagian zona wilayah regional.
                </p>
              </div>

              <div className="p-3.5 bg-secondary-container/40 rounded-DEFAULT border border-secondary-container text-on-surface">
                <span className="font-bold text-primary flex items-center gap-1.5 mb-0.5">
                  <span className="material-symbols-outlined text-[18px]">shield</span>
                  Keamanan Enclave Vault
                </span>
                <p className="text-[12px]">
                  Tautan registrasi dilindungi oleh enkripsi kunci portal. Perubahan struktur wilayah akan langsung
                  tersinkronisasi secara real-time ke portal formulir registrasi calon staf.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="px-5 py-2.5 rounded-DEFAULT bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md transition-all cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <div className="flex flex-col w-full pb-20 max-w-[1600px] mx-auto px-8">
        {/* Page Header Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-extrabold">
                Link Portal
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Konfigurasi Organisasi &amp; Akses
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-DEFAULT bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all cursor-pointer border border-outline-variant/20 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">arrow_back</span>
                <span>Kembali ke Dashboard</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-DEFAULT bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all cursor-pointer border border-outline-variant/20 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">menu_book</span>
              <span>Panduan Skema</span>
            </button>

            <button
              type="button"
              id="topSaveBtn"
              onClick={handleSavePortal}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-DEFAULT font-label-md text-label-md shadow-xs transition-all cursor-pointer ${
                isPortalReady
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-primary hover:bg-primary-container text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSaving ? 'sync' : isPortalReady ? 'check' : 'verified'}
              </span>
              <span>
                {isSaving
                  ? 'Menyimpan...'
                  : isPortalReady
                  ? 'Tersimpan & Aktif'
                  : 'Simpan & Aktifkan Link Portal'}
              </span>
            </button>
          </div>
        </div>

        {/* Main Grid Architecture */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* ===================================================================== */}
          {/* LEFT COLUMN: Core Settings & Region Hierarchy (7 or 8 Cols) */}
          {/* ===================================================================== */}
          <div className="flex flex-col gap-6 xl:col-span-7">
            {/* Section 1: Tautan Pendaftaran Mandiri Staf Banner Card */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-5 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-DEFAULT bg-surface-container-low flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">link</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">
                      Tautan Pendaftaran Mandiri Staf
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">
                      URL gerbang registrasi unik terenkripsi untuk onboarding karyawan
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm transition-colors font-bold ${
                    isPortalReady
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'bg-error-container text-on-error-container'
                  }`}
                  id="portalBadgeLock"
                >
                  <span className="material-symbols-outlined text-[14px]" id="portalBadgeLockIcon">
                    {isPortalReady ? 'check_circle' : 'lock'}
                  </span>
                  <span id="portalBadgeLockText">
                    {isPortalReady ? 'Aktif & Terverifikasi' : 'Terkunci Sementara'}
                  </span>
                </span>
              </div>

              {/* URL Box & Trigger */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 flex items-center px-4 py-3 rounded-DEFAULT bg-surface-container-low gap-3 border border-outline-variant/20">
                  <span className="material-symbols-outlined text-outline text-[20px]">public</span>
                  <span className="font-label-md text-label-md text-on-surface tracking-tight select-all">
                    portal.majo.id/org/
                  </span>
                  <span className="font-label-md text-label-md text-primary font-bold tracking-wide">
                    pt-majo-logistik-indo
                  </span>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm uppercase font-semibold">
                    ID-PRO
                  </span>
                </div>

                <button
                  type="button"
                  id="copyLinkBtn"
                  onClick={handleCopyLink}
                  className={`px-5 py-3 rounded-DEFAULT font-label-md text-label-md inline-flex items-center justify-center gap-2 transition-all select-none ${
                    isPortalReady
                      ? 'bg-primary hover:bg-primary-container text-on-primary cursor-pointer shadow-xs'
                      : 'bg-surface-container-highest text-outline cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isPortalReady ? 'content_copy' : 'lock'}
                  </span>
                  <span>Salin Tautan</span>
                </button>
              </div>

              {/* Info Notice Box */}
              <div
                className={`flex items-start gap-3 p-3.5 rounded-DEFAULT transition-colors ${
                  isPortalReady
                    ? 'bg-secondary-container/60 text-on-secondary-container'
                    : 'bg-tertiary-fixed/30 text-on-tertiary-fixed'
                }`}
                id="portalNoticeBox"
              >
                <span
                  className={`material-symbols-outlined text-[20px] mt-0.5 ${
                    isPortalReady ? 'text-primary' : 'text-tertiary'
                  }`}
                >
                  {isPortalReady ? 'verified_user' : 'info'}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`font-label-sm text-label-sm uppercase tracking-wider font-bold ${
                      isPortalReady ? 'text-primary' : 'text-tertiary'
                    }`}
                  >
                    {isPortalReady ? 'Tautan Siap Dibagikan' : 'Verifikasi Skema Diperlukan'}
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    {isPortalReady ? (
                      <>
                        Struktur organisasi telah terverifikasi oleh <strong>Enclave Vault</strong>. URL gerbang
                        pendaftaran siap didistribusikan kepada calon staf.
                      </>
                    ) : (
                      <>
                        Tombol salin dan gerbang registrasi dinonaktifkan sementara. Simpan minimal{' '}
                        <strong>1 hierarki wilayah operasional</strong> aktif di bawah untuk membuka kunci autentikasi.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Skema Struktur Organisasi */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-6 border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                      Skema Struktur Organisasi
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
                      Wajib
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-outline mt-1">
                    Tentukan model arsitektur distribusi cabang untuk penugasan akun staf secara otomatis.
                  </p>
                </div>
                <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase font-semibold">
                  {currentTab === 'wilayah'
                    ? 'Tipe Mode: Dual (Wilayah & Cabang)'
                    : 'Tipe Mode: Tunggal (Hanya Lokasi)'}
                </span>
              </div>

              {/* Segmented Mode Control Switcher */}
              <div className="grid grid-cols-1 md:grid-cols-2 p-1.5 rounded-DEFAULT bg-surface-container-low gap-1.5 border border-outline-variant/20">
                <button
                  type="button"
                  id="tabModeWilayah"
                  onClick={() => setCurrentTab('wilayah')}
                  className={`flex items-center justify-center gap-3 py-3 px-4 rounded-DEFAULT font-label-md text-label-md transition-all cursor-pointer ${
                    currentTab === 'wilayah'
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs font-bold'
                      : 'bg-transparent hover:bg-surface-container text-on-surface-variant font-normal'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      currentTab === 'wilayah' ? 'text-primary' : 'text-outline'
                    }`}
                  >
                    hub
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-label-md text-label-md leading-tight text-on-surface">
                      Wilayah &amp; Lokasi
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">(SOR &amp; Cabang)</span>
                  </div>
                </button>

                <button
                  type="button"
                  id="tabModeLokasi"
                  onClick={() => setCurrentTab('hanya-lokasi')}
                  className={`flex items-center justify-center gap-3 py-3 px-4 rounded-DEFAULT font-label-md text-label-md transition-all cursor-pointer ${
                    currentTab === 'hanya-lokasi'
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs font-bold'
                      : 'bg-transparent hover:bg-surface-container text-on-surface-variant font-normal'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      currentTab === 'hanya-lokasi' ? 'text-primary' : 'text-outline'
                    }`}
                  >
                    location_city
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-label-md text-label-md leading-tight text-on-surface">
                      Hanya Lokasi
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">
                      Struktur datar tanpa regional
                    </span>
                  </div>
                </button>
              </div>

              {/* Mode Description Banner */}
              <div className="p-3.5 rounded-DEFAULT bg-surface-container-low flex items-center gap-3 transition-all border border-outline-variant/15">
                <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {currentTab === 'wilayah' ? (
                    <>
                      Pilihan saat ini: <strong>Wilayah &amp; Lokasi</strong>. Staf yang mendaftar melalui portal akan
                      memilih provinsi/wilayah terlebih dahulu sebelum memilih unit cabang penempatan.
                    </>
                  ) : (
                    <>
                      Pilihan saat ini: <strong>Hanya Lokasi</strong>. Struktur datar sederhana. Calon staf langsung
                      memilih titik kantor/gudang penempatan dari master database.
                    </>
                  )}
                </p>
              </div>

              {/* ================================================================= */}
              {/* VIEW A: Operational Regions Hierarchy (SOR & Cabang) */}
              {/* ================================================================= */}
              {currentTab === 'wilayah' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold">
                        Daftar Wilayah Kerja Terdaftar
                      </span>
                      <span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm inline-flex items-center justify-center font-bold">
                        {regions.length}
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-outline">
                      {totalRegionBranchesCount} Total Titik Cabang Aktif
                    </span>
                  </div>

                  {/* Sync Master Lokasi Banner */}
                  <div className="p-3.5 rounded-DEFAULT bg-secondary-container/40 border border-secondary-container flex items-center justify-between gap-3 text-on-surface">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-[20px]">sync_alt</span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold text-primary">
                            Sinkronisasi Master Lokasi Aktif
                          </span>
                          <span className="px-2 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-semibold">
                            Terintegrasi Dua Arah
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                          Semua titik cabang di bawah grup wilayah terhubung ke Master Lokasi (tab Hanya Lokasi)
                          untuk mencegah duplikasi data.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('hanya-lokasi')}
                      className="px-3 py-1.5 rounded-DEFAULT bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm shadow-xs transition-all shrink-0 cursor-pointer border border-outline-variant/20"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                        <span>Kelola Master</span>
                      </span>
                    </button>
                  </div>

                  {/* Dynamic List for Regions */}
                  <div className="flex flex-col gap-4" id="regionsListWrapper">
                    {regions.map((region, idx) => {
                      const branchCount = region.locations ? region.locations.length : 0;
                      const indexStr = (idx + 1).toString().padStart(2, '0');

                      return (
                        <div
                          key={region.id}
                          className="p-5 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-4 border border-outline-variant/20 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm text-label-sm font-bold">
                                {indexStr}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase font-bold">
                                    Wilayah Operasi
                                  </span>
                                  <span className="px-2 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                                    {branchCount} Cabang
                                  </span>
                                </div>
                                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                                  {region.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => requestDeleteRegion(region.id)}
                                title="Hapus Wilayah"
                                className="p-1.5 rounded-full hover:bg-surface-container-highest text-outline hover:text-error transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-1">
                            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">
                              Titik Cabang Terdaftar:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {region.locations.map((locName, locIdx) => (
                                <div
                                  key={locName}
                                  className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-surface-container-lowest text-on-surface shadow-xs border border-outline/10"
                                >
                                  <span className="material-symbols-outlined text-primary text-[16px]">
                                    location_on
                                  </span>
                                  <span className="font-label-md text-label-md font-medium">{locName}</span>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteBranchFromRegion(region.id, locIdx)}
                                    title="Hapus Lokasi"
                                    className="text-outline hover:text-error transition-colors p-0.5 rounded-full hover:bg-surface-container-high cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              ))}

                              {/* Tambah Lokasi Trigger */}
                              <button
                                type="button"
                                onClick={() => handleOpenAddBranch(region.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-highest hover:bg-secondary-container text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                <span>Tambah Lokasi</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Region Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsAddRegionModalOpen(true)}
                    className="group flex items-center justify-center gap-3 p-5 rounded-DEFAULT bg-surface-container-lowest hover:bg-surface-container-low border border-dashed border-outline/30 hover:border-primary transition-all shadow-xs cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">add</span>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                      Tambah Wilayah Operasi Baru
                    </span>
                  </button>
                </div>
              )}

              {/* ================================================================= */}
              {/* VIEW B: Hanya Lokasi (Flat Single Level with Search & Pagination) */}
              {/* ================================================================= */}
              {currentTab === 'hanya-lokasi' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          Master Lokasi Mandiri &amp; Operasional
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">
                          Database Pusat
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-outline">
                        Pusat master data seluruh titik operasional. Titik di sini dapat dihubungkan ke klaster
                        wilayah (SOR) maupun dipakai mandiri.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                        {masterLocations.length} Master Lokasi Aktif
                      </span>
                    </div>
                  </div>

                  {/* Search Bar Realtime for Master Locations */}
                  <div className="p-3.5 rounded-DEFAULT bg-surface-container-low border border-outline/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-DEFAULT bg-surface-container-lowest border border-outline/20 focus-within:border-primary transition-all">
                      <span className="material-symbols-outlined text-outline text-[20px]">search</span>
                      <input
                        type="text"
                        value={flatSearchQuery}
                        onChange={(e) => {
                          setFlatSearchQuery(e.target.value);
                          setFlatCurrentPage(1);
                        }}
                        placeholder="Cari nama titik lokasi operasional..."
                        className="w-full bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline"
                      />
                      {flatSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setFlatSearchQuery('');
                            setFlatCurrentPage(1);
                          }}
                          className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 px-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium whitespace-nowrap">
                        {filteredFlatLocations.length === 0
                          ? 'Tidak ada lokasi ditemukan'
                          : `Menampilkan ${
                              (flatCurrentPage - 1) * flatItemsPerPage + 1
                            }-${Math.min(
                              flatCurrentPage * flatItemsPerPage,
                              filteredFlatLocations.length
                            )} dari ${filteredFlatLocations.length} lokasi`}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Area for Flat Locations List */}
                  <div className="relative flex flex-col rounded-DEFAULT border border-outline/15 bg-surface-container-low/50 p-2">
                    <div className="custom-scrollbar flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1.5 scroll-smooth">
                      {currentFlatLocations.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center gap-2.5 text-center bg-surface-container-lowest rounded-DEFAULT border border-outline/10">
                          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-[26px]">search_off</span>
                          </div>
                          <span className="font-headline-md text-headline-md text-on-surface font-bold">
                            Titik Lokasi Tidak Ditemukan
                          </span>
                          <p className="font-body-sm text-outline max-w-sm">
                            Tidak ada master lokasi yang cocok dengan kata kunci "
                            <strong>{flatSearchQuery}</strong>". Anda dapat menambahkan lokasi baru melalui form di
                            bawah.
                          </p>
                          <button
                            type="button"
                            onClick={() => setFlatSearchQuery('')}
                            className="mt-2 px-3.5 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm cursor-pointer"
                          >
                            Reset Pencarian
                          </button>
                        </div>
                      ) : (
                        currentFlatLocations.map((locName) => (
                          <div
                            key={locName}
                            className="p-3 rounded-DEFAULT bg-surface-container-lowest hover:bg-surface-container shadow-xs flex items-center justify-between transition-all border border-outline/10"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary shadow-2xs shrink-0">
                                <span className="material-symbols-outlined text-[18px]">domain</span>
                              </div>
                              <div className="flex flex-col truncate">
                                <span className="font-label-md text-label-md text-on-surface font-medium truncate">
                                  {locName}
                                </span>
                                <span className="text-[11px] text-outline">Master Lokasi Resmi</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-semibold hidden sm:inline-flex">
                                Siap Digunakan
                              </span>
                              <button
                                type="button"
                                onClick={() => requestDeleteFlatLocation(locName)}
                                title="Hapus dari Master"
                                className="p-1.5 rounded-full text-outline hover:text-error hover:bg-surface-container-highest transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Interactive Pagination Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1.5 border-t border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm text-outline font-medium">
                        Halaman {flatCurrentPage} dari {totalFlatPages} (10 lokasi per halaman)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={flatCurrentPage === 1}
                        onClick={() => setFlatCurrentPage((p) => Math.max(1, p - 1))}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-DEFAULT transition-all ${
                          flatCurrentPage === 1
                            ? 'text-outline/40 cursor-not-allowed bg-transparent'
                            : 'text-on-surface hover:bg-surface-container-high bg-surface-container-lowest shadow-2xs cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>

                      {Array.from({ length: totalFlatPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setFlatCurrentPage(pageNum)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-DEFAULT font-label-sm text-[13px] font-bold transition-all cursor-pointer ${
                            pageNum === flatCurrentPage
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high border border-outline/10'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={flatCurrentPage === totalFlatPages}
                        onClick={() => setFlatCurrentPage((p) => Math.min(totalFlatPages, p + 1))}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-DEFAULT transition-all ${
                          flatCurrentPage === totalFlatPages
                            ? 'text-outline/40 cursor-not-allowed bg-transparent'
                            : 'text-on-surface hover:bg-surface-container-high bg-surface-container-lowest shadow-2xs cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Form Tambah Lokasi Baru */}
                  <div className="p-4 rounded-DEFAULT bg-surface-container-low border border-outline/20 flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-DEFAULT bg-surface-container-lowest w-full border border-outline-variant/20">
                      <span className="material-symbols-outlined text-outline text-[20px]">
                        add_location_alt
                      </span>
                      <input
                        type="text"
                        value={newFlatLocationInput}
                        onChange={(e) => setNewFlatLocationInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFlatLocation()}
                        placeholder="Ketik nama lokasi kerja baru (misal: Palembang Depo)..."
                        className="w-full bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFlatLocation}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-DEFAULT bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md inline-flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Tambah Lokasi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Confirmation Bottom Bar */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">rule_folder</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                  Alamat portal siap dibagikan ke staf baru setelah struktur tersimpan dan diverifikasi oleh Enclave
                  Vault.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {onNavigateToDashboard && (
                  <button
                    type="button"
                    onClick={onNavigateToDashboard}
                    className="px-5 py-3 rounded-DEFAULT bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Kembali ke Dashboard</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetToInitial}
                  className="px-5 py-3 rounded-DEFAULT bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-label-md text-label-md transition-all cursor-pointer"
                >
                  Reset Perubahan
                </button>
                <button
                  type="button"
                  id="mainSaveBtn"
                  onClick={handleSavePortal}
                  disabled={isSaving}
                  className={`px-6 py-3 rounded-DEFAULT font-label-lg text-label-lg shadow-md inline-flex items-center gap-2 transition-all cursor-pointer ${
                    isPortalReady
                      ? 'bg-primary hover:bg-primary-container text-on-primary'
                      : 'bg-primary hover:bg-primary-container text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isSaving ? 'sync' : 'check_circle'}
                  </span>
                  <span>
                    {isSaving
                      ? 'Menyimpan...'
                      : isPortalReady
                      ? 'Link Portal Aktif!'
                      : 'Simpan & Aktifkan Link Portal'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT COLUMN: Reset Password Widget & Security Protocol (5 Cols) */}
          {/* ===================================================================== */}
          <div className="flex flex-col gap-6 xl:col-span-5">
            {/* PERMINTAAN RESET KATA SANDI CARD (Directly displayed matching design) */}
            <div
              className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-5 border border-outline-variant/30"
              id="resetPasswordCard"
            >
              {/* Card Header with Accordion Toggle Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#fde8e3] text-[#ba1a1a] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">lock_reset</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold text-[18px] text-[#091c33] leading-tight tracking-tight">
                      Permintaan Reset Kata Sandi
                    </h3>
                    <span className="text-[13px] text-[#3b82f6] font-medium leading-snug">
                      Pengajuan kendala login dari staf
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="btnToggleResetWidget"
                  onClick={() => setIsResetWidgetCollapsed(!isResetWidgetCollapsed)}
                  title="Tutup / Buka Panel"
                  className="w-8 h-8 rounded-full bg-[#eef4ff] hover:bg-[#dbeafe] text-[#1d4ed8] flex items-center justify-center transition-transform duration-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isResetWidgetCollapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                  </span>
                </button>
              </div>

              {/* Collapsible Widget Body */}
              {!isResetWidgetCollapsed && (
                <div className="flex flex-col gap-5 transition-all duration-200">
                  {/* Custom Default Password Perusahaan Box */}
                  <div className="p-4 rounded-DEFAULT bg-[#f5f8ff] border border-[#e0ebff] flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0284c7] text-[18px]">vpn_key</span>
                      <span className="font-bold text-[13.5px] text-[#0f172a]">
                        Custom Default Password Perusahaan
                      </span>
                    </div>
                    <p className="text-[12px] text-[#64748b] leading-normal">
                      Password ini otomatis diterapkan saat reset dieksekusi.
                    </p>
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <div className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-DEFAULT bg-white border border-[#e2e8f0] shadow-2xs focus-within:border-[#3b82f6] transition-all">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={defaultPassword}
                          onChange={(e) => setDefaultPassword(e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-[14px] text-[#0f172a] tracking-wide placeholder:text-[#94a3b8]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          title="Tampilkan/Sembunyikan Kata Sandi"
                          className="text-[#0284c7] hover:text-[#0369a1] flex items-center p-0.5 ml-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast('Password default berhasil diperbarui!', 'success')}
                        className="px-4 py-2.5 rounded-DEFAULT bg-[#edf2f7] hover:bg-[#e2e8f0] text-[#0f172a] font-bold text-[13px] whitespace-nowrap transition-colors shadow-2xs cursor-pointer"
                      >
                        Simpan Default
                      </button>
                    </div>
                  </div>

                  {/* Staff List Header & Select All Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12.5px] font-bold text-[#0284c7] tracking-wider uppercase">
                      DAFTAR STAF PEMOHON
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allStaffSelected}
                        onChange={(e) => handleToggleSelectAllStaff(e.target.checked)}
                        className="w-4 h-4 rounded text-[#0f172a] focus:ring-0 cursor-pointer accent-[#091c33]"
                      />
                      <span className="text-[13px] font-medium text-[#0284c7]">Pilih Semua</span>
                    </label>
                  </div>

                  {/* Dynamic Staff Request Rows */}
                  <div className="flex flex-col gap-2.5" id="staffListContainer">
                    {staffRequests.map((staff) => (
                      <div
                        key={staff.id}
                        className="p-3.5 rounded-DEFAULT bg-[#f8faff] hover:bg-[#f1f5f9] border border-[#edf2f7] flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={staff.selected}
                            onChange={() => handleToggleStaff(staff.id)}
                            className="w-4 h-4 rounded text-[#0f172a] focus:ring-0 cursor-pointer shrink-0 accent-[#091c33]"
                          />
                          <div className="w-9 h-9 rounded-full bg-[#dae0ed] text-[#1e293b] font-bold text-[12px] flex items-center justify-center shrink-0">
                            {staff.avatar}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[13.5px] text-[#0f172a]">{staff.name}</span>
                              <span className="text-[11.5px] text-[#2563eb] font-medium">
                                {staff.username}
                              </span>
                            </div>
                            <span className="text-[11.5px] text-[#64748b]">
                              {staff.role} • {staff.location}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {staff.isReset ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] font-semibold text-[11px]">
                              <span className="material-symbols-outlined text-[13px]">check</span>
                              Direset
                            </span>
                          ) : (
                            <span className="text-[11.5px] text-[#64748b]">{staff.timeAgo}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Responsive Action Button for Password Reset */}
                  <button
                    type="button"
                    disabled={selectedStaffCount === 0 || isResettingStaff}
                    onClick={handleExecuteStaffReset}
                    className={`w-full py-3 px-4 rounded-DEFAULT font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all mt-1 ${
                      selectedStaffCount > 0
                        ? 'bg-[#062c1f] hover:bg-[#042016] text-white cursor-pointer'
                        : 'bg-surface-container-highest text-outline/60 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isResettingStaff ? 'animate-spin' : ''
                      }`}
                    >
                      {isResettingStaff ? 'sync' : 'lock_reset'}
                    </span>
                    <span>
                      {isResettingStaff
                        ? 'Memproses Reset...'
                        : selectedStaffCount > 0
                        ? `Reset Kata Sandi (${selectedStaffCount} Staf)`
                        : 'Pilih Staf Terlebih Dahulu'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Protocol Security & Cryptographic Access Spec */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-4 border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-[20px]">shield</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">
                    Keamanan Tautan Publik
                  </span>
                  <span className="font-body-sm text-body-sm text-outline">Standar Enclave Level 3</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">verified</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Tanpa Kata Sandi Publik
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">
                      Pendaftaran menggunakan autentikasi Link Portal Address.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">
                    approval_delegation
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Persetujuan Super Admin
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">
                      Akun staf yang terdaftar tetap memerlukan persetujuan pada menu Monitoring Wilayah.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() =>
                    showToast('Kunci URL Portal telah diperbarui secara kriptografis.', 'info')
                  }
                  className="w-full py-2.5 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer border border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Regenerasi Kunci URL Portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
