import React, { useState, useMemo, useEffect } from 'react';
import { ChecklistItem, PmItem, RegionConfig } from '../types';
import { getPortalConfig, PM_TYPE_DEFINITIONS, PmTypeKey } from '../services/workflowStore';
import { loadPortalConfigFromFirestore } from '../services/firestoreStore';

interface CreateJobsViewProps {
  onNavigateToDashboard: () => void;
  onJobCreated?: (newPm: PmItem) => void;
}

interface Branch {
  id: string;
  name: string;
  regionKey: 'sor1' | 'sor2';
  checked: boolean;
}

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const INITIAL_ITEMS: ChecklistItem[] = [];
const INITIAL_BRANCHES: Branch[] = [];

const mapConfigToBranches = (config?: { masterWilayah?: string[]; masterGroups?: RegionConfig[] }): Branch[] => {
  if (!config) return INITIAL_BRANCHES;

  const groups = config.masterGroups && config.masterGroups.length > 0
    ? config.masterGroups
    : config.masterWilayah && config.masterWilayah.length > 0
      ? [{ id: 'default-region', name: 'Wilayah Utama', locations: config.masterWilayah }]
      : [];

  return groups.flatMap((group, groupIndex) =>
    group.locations.map((location, locationIndex) => ({
      id: `${group.id || `group-${groupIndex}`}-${locationIndex}`,
      name: location,
      regionKey: `sor${Math.min(groupIndex + 1, 2)}` as 'sor1' | 'sor2',
      checked: true,
    }))
  );
};

export const CreateJobsView: React.FC<CreateJobsViewProps> = ({
  onNavigateToDashboard,
  onJobCreated,
}) => {
  // State
  const [jobTitle, setJobTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateType, setDateType] = useState<'single' | 'range'>('range');
  const [slaEnabled, setSlaEnabled] = useState(true);
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>(INITIAL_ITEMS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [regionNames, setRegionNames] = useState<string[]>([]);

  // New item form state
  const [newItemText, setNewItemText] = useState('');
  const [newItemPmType, setNewItemPmType] = useState<PmTypeKey>('suhu_ruangan');
  const [togglePhoto, setTogglePhoto] = useState(true);
  const [toggleCondition, setToggleCondition] = useState(true);
  const [toggleTimestamp, setToggleTimestamp] = useState(true);
  const [toggleNotes, setToggleNotes] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateBranches = async () => {
      try {
        const cloudConfig = await loadPortalConfigFromFirestore();
        const config = cloudConfig || getPortalConfig();
        if (cancelled) return;
        const nextBranches = mapConfigToBranches(config);
        setBranches(nextBranches);
        setRegionNames((config.masterGroups || []).map((group) => group.name));
      } catch {
        const config = getPortalConfig();
        if (!cancelled) {
          setBranches(mapConfigToBranches(config));
          setRegionNames((config.masterGroups || []).map((group) => group.name));
        }
      }
    };

    hydrateBranches();

    return () => {
      cancelled = true;
    };
  }, []);

  // Modals state
  const [isConditionsModalOpen, setIsConditionsModalOpen] = useState(false);
  const [tempConditionInput, setTempConditionInput] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPublishSuccessOpen, setIsPublishSuccessOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  // Date calculation
  const durationText = useMemo(() => {
    if (!slaEnabled) return 'Tanpa Tenggat Waktu / Fleksibel';
    if (!startDate || !endDate) return 'Tanggal belum ditentukan';
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    if (d2 < d1) return '0 Hari';
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} Hari Kalender`;
  }, [startDate, endDate, slaEnabled]);

  const footerDeadlineText = useMemo(() => {
    if (!slaEnabled) return 'Target Deadline: Fleksibel / Terbuka (Tanpa Batas Waktu Kunci)';
    if (!endDate) return 'Target Deadline: Belum ditentukan';
    const d2 = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const formattedEnd = `${d2.getDate()} ${months[d2.getMonth()]} ${d2.getFullYear()}`;
    return `Target Deadline: ${formattedEnd} (SLA ${durationText})`;
  }, [endDate, slaEnabled, durationText]);

  // Branch statistics
  const sor1Branches = useMemo(() => branches.filter((b) => b.regionKey === 'sor1'), [branches]);
  const sor2Branches = useMemo(() => branches.filter((b) => b.regionKey === 'sor2'), [branches]);

  const sor1CheckedCount = useMemo(() => sor1Branches.filter((b) => b.checked).length, [sor1Branches]);
  const sor2CheckedCount = useMemo(() => sor2Branches.filter((b) => b.checked).length, [sor2Branches]);
  const totalCheckedCount = useMemo(() => branches.filter((b) => b.checked).length, [branches]);

  const activeRegionsCount = useMemo(() => {
    return new Set(branches.filter((branch) => branch.checked).map((branch) => branch.regionKey)).size;
  }, [branches]);

  // Master Checkbox states
  const isAllChecked = totalCheckedCount === branches.length && branches.length > 0;
  const isAllIndeterminate = totalCheckedCount > 0 && totalCheckedCount < branches.length;

  const isSor1AllChecked = sor1CheckedCount === sor1Branches.length && sor1Branches.length > 0;
  const isSor1Indeterminate = sor1CheckedCount > 0 && sor1CheckedCount < sor1Branches.length;

  const isSor2AllChecked = sor2CheckedCount === sor2Branches.length && sor2Branches.length > 0;
  const isSor2Indeterminate = sor2CheckedCount > 0 && sor2CheckedCount < sor2Branches.length;

  // Toggle Branch Single
  const handleToggleBranch = (branchId: string) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, checked: !b.checked } : b))
    );
  };

  // Toggle Region SOR
  const handleToggleRegion = (regionKey: 'sor1' | 'sor2', checked: boolean) => {
    setBranches((prev) =>
      prev.map((b) => (b.regionKey === regionKey ? { ...b, checked } : b))
    );
    showToast(
      `${regionKey.toUpperCase()}: ${checked ? 'Semua cabang dipilih' : 'Semua cabang dibatalkan'}`,
      'info'
    );
  };

  // Toggle All Branches
  const handleToggleAllBranches = (checked: boolean) => {
    setBranches((prev) => prev.map((b) => ({ ...b, checked })));
    showToast(
      checked
        ? 'Semua wilayah & titik lokasi telah dipilih'
        : 'Pilihan titik lokasi cabang dibersihkan',
      'info'
    );
  };

  // Toggle SLA
  const handleToggleSla = (enabled: boolean) => {
    setSlaEnabled(enabled);
    if (enabled) {
      showToast('Batas Waktu Pelaksanaan Tugas: Diaktifkan (Kunci 23:59 WIB)', 'info');
    } else {
      showToast('Batas Waktu Pelaksanaan Tugas dinonaktifkan (Fleksibel)', 'info');
    }
  };

  // Date Change Handler
  const handleDateChange = (type: 'start' | 'end', val: string) => {
    if (type === 'start') {
      setStartDate(val);
      if (new Date(endDate) < new Date(val)) {
        setEndDate(val);
      }
    } else {
      if (new Date(val) < new Date(startDate)) {
        showToast('Tanggal berakhir tidak boleh mendahului tanggal mulai!', 'error');
        setEndDate(startDate);
      } else {
        setEndDate(val);
      }
    }
  };

  // Delete Checklist Item
  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast('Item checklist telah dihapus.', 'info');
  };

  // Add Checklist Item
  const handleAddNewChecklist = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) {
      showToast('Ketik nama sub-tugas terlebih dahulu.', 'error');
      return;
    }

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: trimmed,
      pmType: newItemPmType,
      hasPhoto: togglePhoto,
      conditionText: toggleCondition ? `Kondisi: ${conditionOptions.join(' / ')}` : '',
      hasTimestamp: toggleTimestamp,
      notesText: toggleNotes ? 'Catatan Tambahan' : '',
    };

    setItems((prev) => [...prev, newItem]);
    setNewItemText('');
    showToast('Sub-tugas berhasil ditambahkan ke daftar checklist!');
  };

  // Conditions Dialog
  const handleOpenConditionsDialog = () => {
    setTempConditionInput(conditionOptions.join(', '));
    setIsConditionsModalOpen(true);
  };

  const handleSaveConditions = () => {
    const parsed = tempConditionInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      setConditionOptions(parsed);
      showToast('Opsi pilihan kondisi diperbarui.');
    }
    setIsConditionsModalOpen(false);
  };

  // Reset Form
  const handleResetForm = () => {
    setJobTitle('');
    setStartDate('');
    setEndDate('');
    setDateType('range');
    setSlaEnabled(true);
    const config = getPortalConfig();
    setBranches(mapConfigToBranches(config));
    setRegionNames((config.masterGroups || []).map((group) => group.name));
    setItems(INITIAL_ITEMS);
    setConditionOptions([]);
    setIsResetModalOpen(false);
    showToast('Formulir berhasil direset ke pengaturan default.', 'info');
  };

  // Publish Job
  const handlePublishJob = () => {
    if (!jobTitle.trim()) {
      showToast('Harap isi Judul Utama Pekerjaan (Job Title)!', 'error');
      return;
    }
    if (totalCheckedCount === 0) {
      showToast('Pilih minimal 1 titik cabang target wilayah!', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Susun minimal 1 item sub-tugas checklist teknisi!', 'error');
      return;
    }

    setIsPublishSuccessOpen(true);
  };

  const handleConfirmPublish = () => {
    setIsPublishSuccessOpen(false);
    showToast('Pekerjaan baru telah diluncurkan ke portal!', 'success');

    // Create PM item to sync back to dashboard list
    if (onJobCreated) {
      const selectedBranchNames = branches.filter((b) => b.checked).map((b) => b.name.split('–')[0].trim());
      const newPm: PmItem = {
        id: `pm-${Date.now()}`,
        code: `PM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        title: jobTitle.trim(),
        dates: `${startDate} - ${endDate}`,
        startDate: startDate,
        endDate: endDate,
        dateType,
        singleDate: dateType === 'single' ? startDate : undefined,
        areaType: 'wilayah',
        targetArea: selectedBranchNames.join(', '),
        targetWilayahList: selectedBranchNames,
        pic: '',
        picRole: '',
        progress: 0,
        doneCount: 0,
        totalCount: items.length,
        pendingCount: items.length,
        subStationCount: totalCheckedCount,
        regions: selectedBranchNames.join(', '),
        regionsDetail: selectedBranchNames.map((name) => ({
          name: `${name} (Aktif)`,
          percent: '0%',
          color: 'bg-primary',
        })),
        recentLog: {
          name: '',
          avatar: '',
          activity: 'Pekerjaan baru siap diakses tim teknisi.',
          time: 'Baru saja',
        },
        modules: items.map((i) => ({
          name: i.text,
          itemCount: 1,
          pmType: i.pmType,
          checklist: [i],
        })),
      };
      onJobCreated(newPm);
    }

    onNavigateToDashboard();
  };

  return (
    <div className="flex flex-col w-full min-h-screen relative">
      {/* Toast Notification Container */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-DEFAULT shadow-lg pointer-events-auto border-l-4 ${
              toast.type === 'error'
                ? 'bg-error text-on-error border-white'
                : toast.type === 'info'
                ? 'bg-surface-container-highest text-on-surface border-primary'
                : 'bg-inverse-surface text-inverse-on-surface border-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
            </span>
            <span className="font-body-md text-body-md font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {/* Edit Conditions Modal */}
      {isConditionsModalOpen && (
        <div className="fixed inset-0 z-[9000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">tune</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Konfigurasi Pilihan Kondisi</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConditionsModalOpen(false)}
                className="p-1 rounded-full text-secondary hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="font-body-sm text-secondary">
                Masukkan opsi status kondisi yang dapat dipilih oleh teknisi saat verifikasi (pisahkan dengan koma):
              </p>
              <input
                type="text"
                value={tempConditionInput}
                onChange={(e) => setTempConditionInput(e.target.value)}
                placeholder="Normal, Tidak Normal, Anomali"
                className="w-full px-4 py-2.5 rounded-DEFAULT bg-surface-container-low border border-outline-variant text-on-surface font-body-md outline-none focus:border-primary"
              />
              <span className="text-label-sm text-secondary">
                Contoh: Normal, Tidak Normal atau Baik, Rusak Ringan, Gagal
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsConditionsModalOpen(false)}
                className="px-4 py-2 rounded-DEFAULT text-secondary hover:bg-surface-container font-label-md text-label-md cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConditions}
                className="px-5 py-2 rounded-DEFAULT bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow cursor-pointer"
              >
                Simpan Pilihan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Form Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[9000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[24px]">restart_alt</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Reset Formulir Pekerjaan?</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-full text-secondary hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-md text-body-md text-secondary">
              Apakah Anda yakin ingin mengembalikan seluruh input formulir, target wilayah, dan susunan checklist ke
              kondisi semula?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-DEFAULT text-secondary hover:bg-surface-container font-label-md text-label-md cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2 rounded-DEFAULT bg-error text-on-error font-label-md text-label-md hover:opacity-90 shadow cursor-pointer"
              >
                Ya, Reset Formulir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[9000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Batalkan Pembuatan Pekerjaan?</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 rounded-full text-secondary hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-md text-body-md text-secondary">
              Perubahan yang belum tersimpan akan dibatalkan. Apakah Anda ingin kembali ke ringkasan Dashboard?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-DEFAULT text-secondary hover:bg-surface-container font-label-md text-label-md cursor-pointer"
              >
                Lanjutkan Mengedit
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  onNavigateToDashboard();
                }}
                className="px-5 py-2 rounded-DEFAULT bg-surface-container-highest text-on-surface hover:bg-error hover:text-on-error font-label-md text-label-md transition-colors cursor-pointer"
              >
                Ya, Batalkan & Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Success Modal */}
      {isPublishSuccessOpen && (
        <div className="fixed inset-0 z-[9000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Pekerjaan Berhasil Diterbitkan!</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishSuccessOpen(false)}
                className="p-1 rounded-full text-secondary hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-3.5 bg-secondary-fixed/50 rounded-DEFAULT text-on-secondary-fixed font-body-sm space-y-1">
                <p>
                  <strong>Referensi Job:</strong> {`PM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`}
                </p>
                <p>
                  <strong>Judul:</strong> {jobTitle}
                </p>
                <p>
                  <strong>Alokasi Sasaran:</strong> {totalCheckedCount} Titik Cabang Terpilih
                </p>
                <p>
                  <strong>Tenggat Waktu:</strong>{' '}
                  {slaEnabled ? `${endDate} (SLA Terkunci 23:59 WIB)` : 'Fleksibel (Tanpa Tenggat Waktu)'}
                </p>
                <p>
                  <strong>Total Checklist:</strong> {items.length} Sub-Tugas Terdefinisi
                </p>
                <p>
                  <strong>Status:</strong> Terpublikasi ke Portal Lapangan (Active Sync)
                </p>
              </div>
              <p className="font-body-md text-on-surface">
                Pekerjaan Berhasil Diterbitkan! Tautan penugasan aktif dan siap dikerjakan oleh teknisi lapangan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="px-6 py-2.5 rounded-DEFAULT bg-[#091c33] text-white font-label-md text-label-md hover:bg-primary-container transition-all shadow cursor-pointer font-semibold"
              >
                Selesai & Ke Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <div className="px-8 py-8 flex flex-col gap-8 max-w-[1600px] mx-auto w-full">
        {/* Top Action Breadcrumb & Section Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                Portal Penugasan PM
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold tracking-wide uppercase">
                Penugasan PM &amp; Lapangan
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-extrabold">
              Buat Pekerjaan Baru (Create Jobs)
            </h1>
            <p className="font-body-md text-body-md text-secondary max-w-3xl">
              Rancang instrumen inspeksi preventif, tentukan rentang jadwal operasional, alokasikan ke wilayah/titik cabang sasaran, dan susun kriteria checklist teknisi.
            </p>
          </div>
        </div>

        {/* 12-Column Balanced Desktop Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ===================================================================== */}
          {/* LEFT COLUMN: General Settings & Regional Allocation (5 Columns) */}
          {/* ===================================================================== */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Card 1: Basic Information & Title */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-5 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">assignment</span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface font-bold">
                    Informasi Pekerjaan
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-DEFAULT bg-surface-container font-code-otp text-body-sm text-primary font-bold">
                  Nomor referensi dibuat otomatis saat pekerjaan diterbitkan.
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1"
                    htmlFor="job-title"
                  >
                    Judul Utama Pekerjaan (Job Title) <span className="text-error">*</span>
                  </label>
                  <button
                    className="text-label-sm text-secondary hover:text-error transition-colors cursor-pointer"
                    onClick={() => setJobTitle('')}
                    title="Bersihkan Judul"
                    type="button"
                  >
                    Bersihkan
                  </button>
                </div>
                <input
                  id="job-title"
                  className="w-full px-4 py-3 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-lg text-body-lg outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary transition-all border border-outline-variant/20"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Card 2: Date Range & Execution Schedule */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-5 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface font-bold">
                    Rentang Jadwal Pelaksanaan
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold transition-all ${
                    slaEnabled
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-surface-container text-secondary'
                  }`}
                  id="duration-badge"
                >
                  {durationText}
                </span>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-DEFAULT bg-surface-container-low border border-outline-variant/20">
                <span className="font-label-sm text-secondary font-semibold">Mode tanggal:</span>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as 'single' | 'range')}
                  className="px-3 py-1.5 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-body-sm"
                >
                  <option value="range">Rentang tanggal</option>
                  <option value="single">Satu tanggal</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tanggal Mulai */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-sm text-label-sm text-secondary cursor-pointer"
                    htmlFor="job-start-date"
                  >
                    Tanggal Mulai
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-md text-body-md focus-within:ring-1 focus-within:ring-primary transition-all border border-outline-variant/20">
                    <span className="material-symbols-outlined text-outline text-[18px]">event</span>
                    <input
                      id="job-start-date"
                      className="bg-transparent border-none outline-none w-full text-on-surface font-body-md cursor-pointer"
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                    />
                  </div>
                </div>

                {/* Tanggal Berakhir */}
                <div className="flex flex-col gap-1.5" id="end-date-container">
                  <label
                    className="font-label-sm text-label-sm text-secondary cursor-pointer"
                    htmlFor="job-end-date"
                  >
                    Tanggal Berakhir
                  </label>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-DEFAULT text-on-surface font-body-md text-body-md transition-all border border-outline-variant/20 ${
                      slaEnabled
                        ? 'bg-surface-container-low focus-within:ring-1 focus-within:ring-primary'
                        : 'opacity-40 pointer-events-none bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-outline text-[18px]">event_available</span>
                    <input
                      id="job-end-date"
                      disabled={!slaEnabled && dateType === 'range'}
                      className={`bg-transparent border-none outline-none w-full text-on-surface font-body-md ${
                        slaEnabled && dateType === 'range' ? 'cursor-pointer' : 'cursor-not-allowed'
                      }`}
                      type="date"
                      value={dateType === 'single' ? startDate : endDate}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Toggle for SLA Compliance */}
              <div
                className="flex items-center justify-between p-3.5 rounded-DEFAULT bg-surface-container-low cursor-pointer select-none transition-colors hover:bg-surface-container"
                onClick={() => handleToggleSla(!slaEnabled)}
              >
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Batas Waktu Pelaksanaan Tugas
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    Kunci formulir otomatis setelah jam 23:59 WIB pada tanggal berakhir
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    id="sla-checkbox"
                    checked={slaEnabled}
                    onChange={(e) => handleToggleSla(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center gap-4 text-secondary font-body-sm text-body-sm pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">autorenew</span>
                  Frekuensi: Sekali Pengerjaan (One-off)
                </span>
              </div>
            </div>

            {/* Card 3: Regional & Location Target Hierarchy */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-5 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">hub</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-headline-md text-on-surface font-bold">
                      Target Wilayah &amp; Lokasi
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary">
                      Alokasikan Penugasan ke Titik Sasaran
                    </span>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold"
                  id="branch-counter"
                >
                  {totalCheckedCount} Titik Cabang Terpilih
                </span>
              </div>

              {/* Quick Allocation Option Bar */}
              <div className="p-3 rounded-DEFAULT bg-surface-container-low flex items-center justify-between gap-2 border border-outline-variant/20">
                <label className="flex items-center gap-2 text-on-surface font-label-sm text-label-sm font-semibold cursor-pointer select-none">
                  <input
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                    id="select-all-master-cb"
                    type="checkbox"
                    checked={isAllChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = isAllIndeterminate;
                    }}
                    onChange={(e) => handleToggleAllBranches(e.target.checked)}
                  />
                  <span>Tugaskan ke Semua Wilayah &amp; Lokasi</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    className="font-label-sm text-label-sm text-primary hover:underline font-semibold cursor-pointer"
                    onClick={() => handleToggleAllBranches(true)}
                    type="button"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-outline-variant">•</span>
                  <button
                    className="font-label-sm text-label-sm text-secondary hover:underline cursor-pointer"
                    onClick={() => handleToggleAllBranches(false)}
                    type="button"
                  >
                    Bersihkan
                  </button>
                </div>
              </div>

              {/* Tree Hierarchy Nodes */}
              <div className="flex flex-col gap-3">
                {/* Region 1: SOR 1 */}
                <div className="flex flex-col rounded-DEFAULT bg-surface-container-low overflow-hidden border border-outline-variant/30">
                  <div className="flex items-center justify-between p-3.5 bg-surface-container">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        className="accent-primary w-4 h-4 rounded cursor-pointer"
                        id="region-sor1-master"
                        type="checkbox"
                        checked={isSor1AllChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = isSor1Indeterminate;
                        }}
                        onChange={(e) => handleToggleRegion('sor1', e.target.checked)}
                      />
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {regionNames[0] || 'Wilayah 1'}
                      </span>
                    </label>
                    <span
                      className="px-2 py-0.5 rounded bg-surface-container-lowest text-secondary font-label-sm text-label-sm font-medium"
                      id="sor1-count"
                    >
                      {sor1CheckedCount} / {sor1Branches.length} Cabang
                    </span>
                  </div>
                  <div className="flex flex-col p-3 gap-2.5 pl-8 bg-surface-container-lowest/40">
                    {sor1Branches.map((branch) => (
                      <label
                        key={branch.id}
                        className="flex items-center gap-2.5 text-on-surface cursor-pointer select-none hover:text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={branch.checked}
                          onChange={() => handleToggleBranch(branch.id)}
                          className="accent-primary w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="font-body-md text-body-md">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Region 2: SOR 2 */}
                <div className="flex flex-col rounded-DEFAULT bg-surface-container-low overflow-hidden border border-outline-variant/30">
                  <div className="flex items-center justify-between p-3.5 bg-surface-container">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        className="accent-primary w-4 h-4 rounded cursor-pointer"
                        id="region-sor2-master"
                        type="checkbox"
                        checked={isSor2AllChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = isSor2Indeterminate;
                        }}
                        onChange={(e) => handleToggleRegion('sor2', e.target.checked)}
                      />
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {regionNames[1] || 'Wilayah 2'}
                      </span>
                    </label>
                    <span
                      className="px-2 py-0.5 rounded bg-surface-container-lowest text-secondary font-label-sm text-label-sm font-medium"
                      id="sor2-count"
                    >
                      {sor2CheckedCount} / {sor2Branches.length} Cabang
                    </span>
                  </div>
                  <div className="flex flex-col p-3 gap-2.5 pl-8 bg-surface-container-lowest/40">
                    {sor2Branches.map((branch) => (
                      <label
                        key={branch.id}
                        className="flex items-center gap-2.5 text-on-surface cursor-pointer select-none hover:text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={branch.checked}
                          onChange={() => handleToggleBranch(branch.id)}
                          className="accent-primary w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="font-body-md text-body-md">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-secondary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                <span>Penugasan akan didistribusikan ke setiap titik lokasi yang dicentang.</span>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT COLUMN: Task Structure & Sub-Titles Builder (7 Columns) */}
          {/* ===================================================================== */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Main Checklist Builder Card */}
            <div className="p-6 rounded-DEFAULT bg-surface-container-lowest shadow-xs flex flex-col gap-6 border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">checklist_rtl</span>
                  </div>
                  <div>
                    <span className="font-headline-md text-headline-md text-on-surface font-bold">
                      Struktur Tugas Checklist Inspeksi
                    </span>
                    <p className="font-body-sm text-body-sm text-secondary">
                      Daftar item verifikasi dan instruksi pengerjaan teknisi lapangan
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold"
                    id="task-count-badge"
                  >
                    {items.length} Sub-Tugas Checklist
                  </span>
                </div>
              </div>

              {/* Dynamic Flat Container for Tasks */}
              <div className="flex flex-col gap-3" id="tasks-container">
                {items.length === 0 ? (
                  <div className="p-8 text-center text-secondary font-body-md bg-surface-container-low/50 rounded-DEFAULT border border-dashed border-outline-variant flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[32px]">playlist_add</span>
                    <span className="font-semibold text-on-surface">Belum ada item checklist inspeksi.</span>
                    <span className="text-body-sm text-secondary">
                      Tuliskan nama sub-tugas dan aturan respon melalui form di bawah, lalu klik 'Tambahkan Sub-Tugas ke Checklist'.
                    </span>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={item.id}
                      id={item.id}
                      className="job-item-card flex items-start justify-between gap-4 p-4 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:shadow transition-all duration-200"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm text-on-surface-variant font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <span className="font-label-md text-label-md text-on-surface font-semibold leading-snug">
                            {item.text}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.hasPhoto && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm border border-outline-variant/30">
                                <span className="material-symbols-outlined text-[14px] text-primary">
                                  photo_camera
                                </span>
                                Foto Wajib
                              </span>
                            )}
                            {item.conditionText && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
                                <span className="material-symbols-outlined text-[14px]">tune</span>
                                {item.conditionText}
                              </span>
                            )}
                            {item.hasTimestamp && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                                <span className="material-symbols-outlined text-[14px] text-tertiary">schedule</span>
                                GPS &amp; Timestamp
                              </span>
                            )}
                            {item.notesText && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm">
                                <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                {item.notesText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className="p-1.5 rounded-full hover:bg-error-container text-outline hover:text-error transition-colors shrink-0 cursor-pointer"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Hapus Tugas Ini"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* INPUT PANEL: Add Sub-Title & Field Response Options Configuration */}
              <div className="flex flex-col p-5 rounded-DEFAULT bg-surface-container-low gap-4 mt-2 border border-outline-variant/40">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">add_circle</span>
                    Tambah Sub-Tugas Checklist &amp; Aturan Respon
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary">Ditugaskan ke lokasi terpilih</span>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    id="new-item-text"
                    className="w-full px-4 py-3 rounded-DEFAULT bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none placeholder:text-outline focus:bg-surface-bright focus:ring-1 focus:ring-primary transition-all border border-outline-variant/30"
                    placeholder="Ketik nama sub-tugas / item checklist baru di sini..."
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewChecklist();
                      }
                    }}
                  />
                  <select
                    value={newItemPmType}
                    onChange={(e) => setNewItemPmType(e.target.value as PmTypeKey)}
                    className="w-full px-4 py-2.5 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-body-sm"
                  >
                    {Object.values(PM_TYPE_DEFINITIONS).map((definition) => (
                      <option key={definition.key} value={definition.key}>{definition.label}</option>
                    ))}
                  </select>
                </div>

                {/* Field Responses Feature Toggles */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
                    Fitur Respon Petugas di Lapangan (Wajib Saat Teknisi Mengerjakan PM):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-DEFAULT bg-surface-container-lowest cursor-pointer text-on-surface hover:bg-surface-bright transition-colors select-none border border-outline-variant/20">
                      <input
                        checked={togglePhoto}
                        onChange={(e) => setTogglePhoto(e.target.checked)}
                        className="accent-primary w-4 h-4 rounded cursor-pointer"
                        id="toggle-photo"
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">photo_camera</span>
                        Insert Picture (Foto Lapangan Wajib)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-DEFAULT bg-surface-container-lowest cursor-pointer text-on-surface hover:bg-surface-bright transition-colors select-none border border-outline-variant/20">
                      <input
                        checked={toggleCondition}
                        onChange={(e) => setToggleCondition(e.target.checked)}
                        className="accent-primary w-4 h-4 rounded cursor-pointer"
                        id="toggle-condition"
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                        Choose Kondisi ({conditionOptions.join(' / ')})
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-DEFAULT bg-surface-container-lowest cursor-pointer text-on-surface hover:bg-surface-bright transition-colors select-none border border-outline-variant/20">
                      <input
                        checked={toggleTimestamp}
                        onChange={(e) => setToggleTimestamp(e.target.checked)}
                        className="accent-primary w-4 h-4 rounded cursor-pointer"
                        id="toggle-timestamp"
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                        Catat Waktu &amp; Tanggal (GPS Auto)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-DEFAULT bg-surface-container-lowest cursor-pointer text-on-surface hover:bg-surface-bright transition-colors select-none border border-outline-variant/20">
                      <input
                        checked={toggleNotes}
                        onChange={(e) => setToggleNotes(e.target.checked)}
                        className="accent-primary w-4 h-4 rounded cursor-pointer"
                        id="toggle-notes"
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        Text Box (Keterangan Manual Petugas)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Conditions Preview Pill */}
                <div className="flex items-center justify-between p-3 rounded-DEFAULT bg-surface-container-lowest border border-outline-variant/20">
                  <div className="flex items-center gap-2 flex-wrap" id="conditions-pills-container">
                    <span className="font-label-sm text-label-sm text-secondary">Pilihan Kondisi:</span>
                    {conditionOptions.map((opt) => (
                      <span
                        key={opt}
                        className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-medium"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                  <button
                    className="font-label-sm text-label-sm text-primary hover:underline font-semibold cursor-pointer"
                    onClick={handleOpenConditionsDialog}
                    type="button"
                  >
                    + Edit / Tambah Opsi
                  </button>
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-2">
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-DEFAULT bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md transition-all shadow-xs active:scale-95 cursor-pointer font-semibold"
                    onClick={handleAddNewChecklist}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_task</span>
                    <span>+ Tambahkan Sub-Tugas ke Checklist</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Interactive Summary Status Bar */}
        <div className="sticky bottom-6 z-30 p-4 rounded-DEFAULT bg-surface-container-lowest/95 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-tertiary/15 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">info</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-semibold" id="footer-summary-text">
                Siap diterbitkan untuk {totalCheckedCount} Titik Lokasi di {activeRegionsCount} Wilayah Operasional •{' '}
                {items.length} Total Checklist Inspeksi
              </span>
              <span className="font-body-sm text-body-sm text-secondary" id="footer-deadline">
                {footerDeadlineText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              className="px-4 py-2 rounded-DEFAULT text-secondary hover:bg-surface-container hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
              onClick={() => setIsResetModalOpen(true)}
              type="button"
            >
              Reset Form
            </button>
            <button
              className="px-4 py-2 rounded-DEFAULT text-error hover:bg-error-container font-label-md text-label-md transition-colors cursor-pointer"
              onClick={() => setIsCancelModalOpen(true)}
              type="button"
            >
              Batal
            </button>
            <button
              className="flex items-center gap-2 px-6 py-2.5 rounded-DEFAULT bg-on-primary-fixed text-on-primary hover:bg-primary-container font-label-md text-label-md transition-all shadow-md active:scale-95 cursor-pointer font-semibold"
              onClick={handlePublishJob}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Simpan &amp; Luncurkan Pekerjaan (Done)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
