import React, { useState, useMemo, useEffect } from 'react';
import { ChecklistItem, ConditionLogicRange, PmItem, RegionConfig } from '../types';
import { getPortalConfig } from '../services/workflowStore';
import { loadPortalConfigFromFirestore } from '../services/firestoreStore';

interface CreateJobsViewProps {
  onNavigateToDashboard: () => void;
  onJobCreated?: (newPm: PmItem) => void | Promise<void>;
}

interface Branch {
  id: string;
  name: string;
  regionKey: 'sor1' | 'sor2';
  checked: boolean;
  subLocations: BranchSubLocation[];
}

interface BranchSubLocation {
  id: string;
  name: string;
  checked: boolean;
  places: Array<{ id: string; name: string; checked: boolean }>;
}

interface SubtaskGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const INITIAL_SUBTASKS: SubtaskGroup[] = [];
const INITIAL_BRANCHES: Branch[] = [];

const mapConfigToBranches = (config?: { masterWilayah?: string[]; masterGroups?: RegionConfig[] }): Branch[] => {
  if (!config) return INITIAL_BRANCHES;

  const groups = config.masterGroups && config.masterGroups.length > 0
    ? config.masterGroups
    : config.masterWilayah && config.masterWilayah.length > 0
      ? [{ id: 'default-region', name: 'Wilayah Utama', locations: config.masterWilayah }]
      : [];

  return groups.flatMap((group, groupIndex) =>
    group.locations.map((location, locationIndex) => {
      const subLocations = (group.locationHierarchy?.[location] || []).map((subLocation) => ({
        id: subLocation.id,
        name: subLocation.name,
        checked: true,
        places: (subLocation.places || []).map((place, placeIndex) => ({
          id: `${subLocation.id}-place-${placeIndex}`,
          name: place,
          checked: true,
        })),
      }));
      return {
        id: `${group.id || `group-${groupIndex}`}-${locationIndex}`,
        name: location,
        regionKey: `sor${Math.min(groupIndex + 1, 2)}` as 'sor1' | 'sor2',
        checked: true,
        subLocations,
      };
    })
  );
};

const hasBranchSelection = (branch: Branch) =>
  branch.checked || branch.subLocations.some((subLocation) =>
    subLocation.checked || subLocation.places.some((place) => place.checked)
  );

export const CreateJobsView: React.FC<CreateJobsViewProps> = ({
  onNavigateToDashboard,
  onJobCreated,
}) => {
  // State
  const [jobTitle, setJobTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [slaEnabled, setSlaEnabled] = useState(true);
  const [subtasks, setSubtasks] = useState<SubtaskGroup[]>(INITIAL_SUBTASKS);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [activeSubtaskId, setActiveSubtaskId] = useState('');
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [regionNames, setRegionNames] = useState<string[]>([]);

  // New item form state
  const [newItemText, setNewItemText] = useState('');
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);
  const [newConditionOption, setNewConditionOption] = useState('');
  const [logicRanges, setLogicRanges] = useState<ConditionLogicRange[]>([]);
  const [newLogicRange, setNewLogicRange] = useState({ min: '', max: '', output: '' });
  const [togglePhoto, setTogglePhoto] = useState(true);
  const [toggleCondition, setToggleCondition] = useState(true);
  const [toggleLogicCondition, setToggleLogicCondition] = useState(false);
  const [toggleTimestamp, setToggleTimestamp] = useState(true);
  const [toggleNotes, setToggleNotes] = useState(false);
  const allChecklistItems = subtasks.flatMap((subtask) => subtask.items);
  const activeSubtask = subtasks.find((subtask) => subtask.id === activeSubtaskId) || subtasks[0];

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
    if (!slaEnabled) return 'Tanggal Tunggal / Fleksibel';
    if (!startDate || !endDate) return 'Tanggal belum ditentukan';
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    if (d2 < d1) return '0 Hari';
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} Hari Kalender`;
  }, [startDate, endDate, slaEnabled]);

  const footerDeadlineText = useMemo(() => {
    if (!slaEnabled) {
      return `Tanggal Pelaksanaan: ${startDate || 'Belum ditentukan'} (Single Date, tanpa SLA)`;
    }
    if (!endDate) return 'Target Deadline: Belum ditentukan';
    const d2 = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const formattedEnd = `${d2.getDate()} ${months[d2.getMonth()]} ${d2.getFullYear()}`;
    return `Target Deadline: ${formattedEnd} (SLA ${durationText})`;
  }, [endDate, slaEnabled, durationText]);

  // Branch statistics
  const sor1Branches = useMemo(() => branches.filter((b) => b.regionKey === 'sor1'), [branches]);
  const sor2Branches = useMemo(() => branches.filter((b) => b.regionKey === 'sor2'), [branches]);

  const sor1CheckedCount = useMemo(() => sor1Branches.filter(hasBranchSelection).length, [sor1Branches]);
  const sor2CheckedCount = useMemo(() => sor2Branches.filter(hasBranchSelection).length, [sor2Branches]);
  const totalCheckedCount = useMemo(() => branches.filter(hasBranchSelection).length, [branches]);

  const activeRegionsCount = useMemo(() => {
    return new Set(branches.filter(hasBranchSelection).map((branch) => branch.regionKey)).size;
  }, [branches]);

  // Master Checkbox states
  const isAllChecked = branches.length > 0 && branches.every((branch) => branch.checked);
  const isAllIndeterminate = totalCheckedCount > 0 && !isAllChecked;

  const isSor1AllChecked = sor1Branches.length > 0 && sor1Branches.every((branch) => branch.checked);
  const isSor1Indeterminate = sor1CheckedCount > 0 && !isSor1AllChecked;

  const isSor2AllChecked = sor2Branches.length > 0 && sor2Branches.every((branch) => branch.checked);
  const isSor2Indeterminate = sor2CheckedCount > 0 && !isSor2AllChecked;

  // Toggle Branch Single
  const handleToggleBranch = (branchId: string, checked: boolean) => {
    setBranches((prev) =>
      prev.map((branch) => branch.id === branchId ? {
        ...branch,
        checked,
        subLocations: branch.subLocations.map((subLocation) => ({
          ...subLocation,
          checked,
          places: subLocation.places.map((place) => ({ ...place, checked })),
        })),
      } : branch)
    );
  };

  const handleToggleSubLocation = (branchId: string, subLocationId: string, checked: boolean) => {
    setBranches((prev) => prev.map((branch) => {
      if (branch.id !== branchId) return branch;
      const subLocations = branch.subLocations.map((subLocation) => subLocation.id === subLocationId
        ? {
          ...subLocation,
          checked,
          places: subLocation.places.map((place) => ({ ...place, checked })),
        }
        : subLocation);
      return { ...branch, checked: subLocations.every((subLocation) => subLocation.checked), subLocations };
    }));
  };

  const handleTogglePlace = (branchId: string, subLocationId: string, placeId: string, checked: boolean) => {
    setBranches((prev) => prev.map((branch) => {
      if (branch.id !== branchId) return branch;
      const subLocations = branch.subLocations.map((subLocation) => {
        if (subLocation.id !== subLocationId) return subLocation;
        const places = subLocation.places.map((place) => place.id === placeId ? { ...place, checked } : place);
        return { ...subLocation, checked: places.length > 0 && places.every((place) => place.checked), places };
      });
      return { ...branch, checked: subLocations.every((subLocation) => subLocation.checked), subLocations };
    }));
  };

  // Toggle Region SOR
  const handleToggleRegion = (regionKey: 'sor1' | 'sor2', checked: boolean) => {
    setBranches((prev) =>
      prev.map((branch) => branch.regionKey === regionKey ? {
        ...branch,
        checked,
        subLocations: branch.subLocations.map((subLocation) => ({
          ...subLocation,
          checked,
          places: subLocation.places.map((place) => ({ ...place, checked })),
        })),
      } : branch)
    );
    showToast(
      `${regionKey.toUpperCase()}: ${checked ? 'Semua area dipilih' : 'Semua area dibatalkan'}`,
      'info'
    );
  };

  // Toggle All Branches
  const handleToggleAllBranches = (checked: boolean) => {
    setBranches((prev) => prev.map((branch) => ({
      ...branch,
      checked,
      subLocations: branch.subLocations.map((subLocation) => ({
        ...subLocation,
        checked,
        places: subLocation.places.map((place) => ({ ...place, checked })),
      })),
    })));
    showToast(
      checked
        ? 'Semua area pekerjaan telah dipilih'
        : 'Pilihan area pekerjaan dibersihkan',
      'info'
    );
  };

  // Toggle SLA
  const handleToggleSla = (enabled: boolean) => {
    setSlaEnabled(enabled);
    if (enabled) {
      if (!endDate && startDate) setEndDate(startDate);
      showToast('Batas Waktu Pelaksanaan Tugas: Diaktifkan (Kunci 23:59 WIB)', 'info');
    } else {
      showToast('Mode tanggal tunggal diaktifkan (tanpa tenggat waktu)', 'info');
    }
  };

  // Date Change Handler
  const handleDateChange = (type: 'start' | 'end', val: string) => {
    if (type === 'start') {
      setStartDate(val);
      if (slaEnabled && (!endDate || endDate < val)) {
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
  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) {
      showToast('Isi nama Sub-Tugas terlebih dahulu.', 'error');
      return;
    }
    const subtask: SubtaskGroup = {
      id: `subtask-${crypto.randomUUID()}`,
      title: trimmed,
      items: [],
    };
    setSubtasks((previous) => [...previous, subtask]);
    setActiveSubtaskId(subtask.id);
    setNewSubtaskTitle('');
    setConditionOptions([]);
    setNewConditionOption('');
    setLogicRanges([]);
    setNewLogicRange({ min: '', max: '', output: '' });
    setToggleCondition(false);
    setToggleLogicCondition(false);
    showToast('Sub-Tugas dibuat. Tambahkan Something To Do ke dalamnya.');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setSubtasks((previous) => {
      const remaining = previous.filter((subtask) => subtask.id !== subtaskId);
      if (activeSubtaskId === subtaskId) setActiveSubtaskId(remaining[0]?.id || '');
      return remaining;
    });
    showToast('Sub-Tugas dan item di dalamnya dihapus.', 'info');
  };

  const handleDeleteItem = (subtaskId: string, itemId: string) => {
    setSubtasks((previous) => previous.map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, items: subtask.items.filter((item) => item.id !== itemId) }
        : subtask
    ));
    showToast('Something To Do dihapus.', 'info');
  };

  const handleAddConditionOption = () => {
    const option = newConditionOption.trim();
    if (!option) return;
    if (conditionOptions.some((existing) => existing.toLowerCase() === option.toLowerCase())) {
      showToast(`Pilihan kondisi "${option}" sudah ada.`, 'error');
      return;
    }
    setConditionOptions((previous) => [...previous, option]);
    setNewConditionOption('');
  };

  const handleAddLogicRange = () => {
    const min = Number(newLogicRange.min);
    const max = Number(newLogicRange.max);
    const output = newLogicRange.output.trim();
    if (newLogicRange.min === '' || newLogicRange.max === '' || !Number.isFinite(min) || !Number.isFinite(max) || min > max || !output) {
      showToast('Isi nilai Min, Max, dan Output yang valid.', 'error');
      return;
    }
    if (logicRanges.some((range) => min <= range.max && max >= range.min)) {
      showToast('Rentang baru beririsan dengan rentang yang sudah ada.', 'error');
      return;
    }
    const nextRanges = [...logicRanges, {
      id: `logic-${crypto.randomUUID()}`,
      min,
      max,
      output,
    }].sort((first, second) => first.min - second.min);
    setLogicRanges(nextRanges);
    setNewLogicRange({ min: '', max: '', output: '' });
  };

  // Add Checklist Item
  const handleAddNewChecklist = () => {
    if (!activeSubtask) {
      showToast('Buat atau pilih Sub-Tugas terlebih dahulu.', 'error');
      return;
    }
    const trimmed = newItemText.trim();
    if (!trimmed) {
      showToast('Isi Something To Do terlebih dahulu.', 'error');
      return;
    }
    if (toggleCondition && conditionOptions.length === 0) {
      showToast('Tambahkan minimal satu Pilihan Kondisi.', 'error');
      return;
    }
    if (toggleLogicCondition && logicRanges.length === 0) {
      showToast('Tambahkan minimal satu Rentang Logika Kondisi.', 'error');
      return;
    }
    const newItem: ChecklistItem = {
      id: `item-${crypto.randomUUID()}`,
      text: trimmed,
      hasPhoto: togglePhoto,
      hasCondition: toggleCondition || toggleLogicCondition,
      conditionMode: toggleCondition && toggleLogicCondition
        ? 'both'
        : toggleLogicCondition
          ? 'logic'
          : toggleCondition
            ? 'options'
            : undefined,
      conditionOptions: toggleCondition ? conditionOptions : [],
      conditionLogic: toggleLogicCondition ? logicRanges : [],
      conditionText: [
        toggleCondition ? `Kondisi: ${conditionOptions.join(' / ')}` : '',
        toggleLogicCondition ? `Logic Kondisi (${logicRanges.length} rentang)` : '',
      ].filter(Boolean).join(' · '),
      hasTimestamp: toggleTimestamp,
      hasNotes: toggleNotes,
      notesText: toggleNotes ? 'Catatan Petugas' : '',
    };

    setSubtasks((previous) => previous.map((subtask) =>
      subtask.id === activeSubtask.id
        ? { ...subtask, items: [...subtask.items, newItem] }
        : subtask
    ));
    setNewItemText('');
    setConditionOptions([]);
    setNewConditionOption('');
    setLogicRanges([]);
    setNewLogicRange({ min: '', max: '', output: '' });
    showToast('Something To Do ditambahkan ke Sub-Tugas.');
  };

  // Reset Form
  const handleResetForm = () => {
    setJobTitle('');
    setStartDate('');
    setEndDate('');
    setSlaEnabled(true);
    const config = getPortalConfig();
    setBranches(mapConfigToBranches(config));
    setRegionNames((config.masterGroups || []).map((group) => group.name));
    setSubtasks(INITIAL_SUBTASKS);
    setNewSubtaskTitle('');
    setActiveSubtaskId('');
    setConditionOptions([]);
    setNewConditionOption('');
    setLogicRanges([]);
    setNewLogicRange({ min: '', max: '', output: '' });
    setToggleCondition(true);
    setToggleLogicCondition(false);
    setIsResetModalOpen(false);
    showToast('Formulir berhasil direset ke pengaturan default.', 'info');
  };

  // Publish Job
  const handlePublishJob = () => {
    if (!jobTitle.trim()) {
      showToast('Harap isi Judul Utama Pekerjaan (Job Title)!', 'error');
      return;
    }
    if (!startDate) {
      showToast('Pilih tanggal pelaksanaan pekerjaan terlebih dahulu.', 'error');
      return;
    }
    if (slaEnabled && !endDate) {
      showToast('Pilih tanggal berakhir untuk rentang jadwal pekerjaan.', 'error');
      return;
    }
    if (totalCheckedCount === 0) {
      showToast('Pilih minimal 1 area pekerjaan!', 'error');
      return;
    }
    if (allChecklistItems.length === 0) {
      showToast('Tambahkan minimal satu Something To Do ke dalam Sub-Tugas.', 'error');
      return;
    }

    setIsPublishSuccessOpen(true);
  };

  const handleConfirmPublish = async () => {

    // Create PM item to sync back to dashboard list
    if (onJobCreated) {
      const selectedBranches = branches.filter(hasBranchSelection);
      const selectedBranchNames = selectedBranches.map((branch) => branch.name);
      const targetAreaDetails = selectedBranches.map((branch) => ({
        location: branch.name,
        subLocations: branch.subLocations
          .filter((subLocation) => subLocation.checked || subLocation.places.some((place) => place.checked))
          .map((subLocation) => ({
            name: subLocation.name,
            places: subLocation.places.filter((place) => place.checked).map((place) => place.name),
          })),
      }));
      const selectedAreaLabels = targetAreaDetails.flatMap((location) =>
        location.subLocations.length > 0
          ? location.subLocations.flatMap((subLocation) =>
            subLocation.places.length > 0
              ? subLocation.places.map((place) => `${location.location} / ${subLocation.name} / ${place}`)
              : [`${location.location} / ${subLocation.name}`]
          )
          : [location.location]
      );
      const newPm: PmItem = {
        id: `pm-${Date.now()}`,
        code: `PM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        title: jobTitle.trim(),
        dates: slaEnabled ? `${startDate} - ${endDate}` : startDate,
        startDate: startDate,
        endDate: slaEnabled ? endDate : startDate,
        dateType: slaEnabled ? 'range' : 'single',
        ...(!slaEnabled ? { singleDate: startDate } : {}),
        areaType: 'wilayah',
        targetArea: selectedAreaLabels.join(', '),
        targetWilayahList: selectedBranchNames,
        targetAreaDetails,
        pic: '',
        picRole: '',
        progress: 0,
        doneCount: 0,
        totalCount: allChecklistItems.length,
        pendingCount: allChecklistItems.length,
        subStationCount: totalCheckedCount,
        regions: selectedAreaLabels.join(', '),
        regionsDetail: selectedAreaLabels.map((name) => ({
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
        modules: subtasks.filter((subtask) => subtask.items.length > 0).map((subtask) => ({
          name: subtask.title,
          itemCount: subtask.items.length,
          checklist: subtask.items,
        })),
      };
      try {
        await onJobCreated(newPm);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Pekerjaan gagal disimpan ke portal.', 'error');
        return;
      }
    }

    setIsPublishSuccessOpen(false);
    showToast('Pekerjaan baru telah diluncurkan ke portal!', 'success');
    onNavigateToDashboard();
  };

  const renderBranch = (branch: Branch) => (
    <div key={branch.id} className="flex flex-col gap-2">
      <label className="flex items-center gap-2.5 text-on-surface cursor-pointer select-none hover:text-primary transition-colors">
        <input
          type="checkbox"
          checked={branch.checked}
          ref={(element) => {
            if (element) element.indeterminate = !branch.checked && hasBranchSelection(branch);
          }}
          onChange={(event) => handleToggleBranch(branch.id, event.target.checked)}
          className="accent-primary w-4 h-4 rounded cursor-pointer"
        />
        <span className="font-body-md text-body-md font-medium">{branch.name}</span>
      </label>
      {branch.subLocations.length > 0 && (
        <div className="ml-6 flex flex-col gap-2 border-l-2 border-outline-variant/30 pl-3">
          {branch.subLocations.map((subLocation) => {
            const hasSelection = subLocation.checked || subLocation.places.some((place) => place.checked);
            return (
              <div key={subLocation.id} className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-on-surface-variant cursor-pointer select-none hover:text-primary">
                  <input
                    type="checkbox"
                    checked={subLocation.checked}
                    ref={(element) => {
                      if (element) element.indeterminate = !subLocation.checked && hasSelection;
                    }}
                    onChange={(event) => handleToggleSubLocation(branch.id, subLocation.id, event.target.checked)}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="font-body-sm text-body-sm">{subLocation.name}</span>
                </label>
                {subLocation.places.length > 0 && (
                  <div className="ml-6 flex flex-col gap-2 border-l border-outline-variant/30 pl-3">
                    {subLocation.places.map((place) => (
                      <label key={place.id} className="flex items-center gap-2 text-secondary cursor-pointer select-none hover:text-primary">
                        <input
                          type="checkbox"
                          checked={place.checked}
                          onChange={(event) => handleTogglePlace(branch.id, subLocation.id, place.id, event.target.checked)}
                          className="accent-primary w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="font-body-sm text-body-sm">{place.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

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
              Apakah Anda yakin ingin mengembalikan seluruh input formulir, area pekerjaan, dan susunan checklist ke
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
                  <strong>Alokasi Sasaran:</strong> {totalCheckedCount} Lokasi Terpilih
                </p>
                <p>
                  <strong>Jadwal:</strong>{' '}
                  {slaEnabled
                    ? `${startDate} - ${endDate} (SLA Terkunci 23:59 WIB)`
                    : `${startDate} (Single Date, tanpa SLA)`}
                </p>
                <p>
                  <strong>Total Checklist:</strong> {subtasks.length} Sub-Tugas, {allChecklistItems.length} Something To Do
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
              Rancang instrumen inspeksi preventif, tentukan rentang jadwal operasional, pilih area pekerjaan hingga Tempat, dan susun kriteria checklist teknisi.
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
                    {slaEnabled ? 'Rentang Jadwal Pelaksanaan' : 'Tanggal Pelaksanaan'}
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

              <div className={`grid ${slaEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {/* Tanggal Mulai */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-sm text-label-sm text-secondary cursor-pointer"
                    htmlFor="job-start-date"
                  >
                    {slaEnabled ? 'Tanggal Mulai' : 'Tanggal Pelaksanaan'}
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
                {slaEnabled && <div className="flex flex-col gap-1.5" id="end-date-container">
                  <label
                    className="font-label-sm text-label-sm text-secondary cursor-pointer"
                    htmlFor="job-end-date"
                  >
                    Tanggal Berakhir
                  </label>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-md text-body-md transition-all border border-outline-variant/20 focus-within:ring-1 focus-within:ring-primary"
                  >
                    <span className="material-symbols-outlined text-outline text-[18px]">event_available</span>
                    <input
                      id="job-end-date"
                      className="bg-transparent border-none outline-none w-full text-on-surface font-body-md cursor-pointer"
                      type="date"
                      value={endDate}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                    />
                  </div>
                </div>}
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
                    {slaEnabled
                      ? 'Kunci formulir otomatis setelah jam 23:59 WIB pada tanggal berakhir'
                      : 'Gunakan satu tanggal pelaksanaan tanpa batas waktu terkunci'}
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
                      Area yang diberikan pekerjaan
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary">
                      Pilih wilayah, lokasi, Sub Lokasi, dan Tempat sasaran
                    </span>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold"
                  id="branch-counter"
                >
                  {totalCheckedCount} Lokasi Terpilih
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
                  <span>Pilih semua area pekerjaan</span>
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
                      {sor1CheckedCount} / {sor1Branches.length} Lokasi
                    </span>
                  </div>
                  <div className="flex flex-col p-3 gap-2.5 pl-8 bg-surface-container-lowest/40">
                    {sor1Branches.map(renderBranch)}
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
                      {sor2CheckedCount} / {sor2Branches.length} Lokasi
                    </span>
                  </div>
                  <div className="flex flex-col p-3 gap-2.5 pl-8 bg-surface-container-lowest/40">
                    {sor2Branches.map(renderBranch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-secondary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                <span>Sub Lokasi dan Tempat yang dipilih ikut dicatat sebagai area pekerjaan.</span>
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
                    {subtasks.length} Sub-Tugas · {allChecklistItems.length} Something To Do
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  aria-label="Nama Sub-Tugas"
                  className="min-w-0 flex-1 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface outline-none placeholder:text-outline focus:bg-surface-bright focus:ring-1 focus:ring-primary"
                  placeholder="Nama Sub-Tugas"
                  value={newSubtaskTitle}
                  onChange={(event) => setNewSubtaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                />
                <button
                  aria-label="Tambah Sub-Tugas"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-DEFAULT bg-primary text-on-primary shadow-xs hover:bg-primary-container"
                  onClick={handleAddSubtask}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>

              {subtasks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {subtasks.map((subtask, index) => (
                    <button
                      key={subtask.id}
                      type="button"
                      onClick={() => setActiveSubtaskId(subtask.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                        activeSubtask?.id === subtask.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span>{index + 1}. {subtask.title}</span>
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs">{subtask.items.length}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeSubtask ? (
                <React.Fragment>
                <div className="flex flex-col gap-4 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-label-md text-label-md font-bold text-on-surface">{activeSubtask.title}</h4>
                      <p className="text-xs text-secondary">Something To Do di dalam Sub-Tugas ini</p>
                    </div>
                    <button
                      aria-label={`Hapus Sub-Tugas ${activeSubtask.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-error hover:bg-error-container"
                      onClick={() => handleDeleteSubtask(activeSubtask.id)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                  {activeSubtask.items.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {activeSubtask.items.map((item, index) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-on-surface-variant">{index + 1}</span>
                            <div className="min-w-0">
                              <p className="font-label-md text-label-md font-semibold text-on-surface">{item.text}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                {item.hasPhoto && <span className="rounded-full bg-surface-container px-2 py-0.5">Foto</span>}
                                {item.hasCondition && <span className="rounded-full bg-secondary-fixed px-2 py-0.5">{item.conditionText || 'Kondisi'}</span>}
                                {item.hasTimestamp && <span className="rounded-full bg-surface-container px-2 py-0.5">Tanggal &amp; GPS</span>}
                                {item.hasNotes && <span className="rounded-full bg-tertiary-fixed px-2 py-0.5">Keterangan</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            aria-label={`Hapus ${item.text}`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-outline hover:bg-error-container hover:text-error"
                            onClick={() => handleDeleteItem(activeSubtask.id, item.id)}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-outline-variant/50 p-4 text-center text-sm text-secondary">Belum ada Something To Do di Sub-Tugas ini.</p>
                  )}

                  <div className="flex items-center gap-2 border-t border-outline-variant/30 pt-4">
                    <input
                      aria-label="Something To Do"
                      className="min-w-0 flex-1 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface outline-none placeholder:text-outline focus:ring-1 focus:ring-primary"
                      placeholder="Something to do"
                      value={newItemText}
                      onChange={(event) => setNewItemText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAddNewChecklist();
                        }
                      }}
                    />
                    <button
                      aria-label="Tambah Something To Do"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-DEFAULT bg-primary text-on-primary shadow-xs hover:bg-primary-container"
                      onClick={handleAddNewChecklist}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                  </div>

                </div>
                </React.Fragment>
              ) : (
                <p className="rounded-lg border border-dashed border-outline-variant/40 p-5 text-center text-sm text-secondary">Buat Sub-Tugas, lalu tambahkan Something To Do ke dalamnya.</p>
              )}
            </div>
            {activeSubtask && (
              <div className="flex flex-col gap-4 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs">
                <div>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Fitur respons petugas</h3>
                  <p className="mt-1 text-sm text-secondary">Pengaturan ini diterapkan pada Something To Do yang akan ditambahkan.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-DEFAULT border border-outline-variant/20 p-2.5 text-on-surface">
                    <input checked={togglePhoto} onChange={(event) => setTogglePhoto(event.target.checked)} className="h-4 w-4 accent-primary" type="checkbox" />
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="material-symbols-outlined text-[16px] text-primary">photo_camera</span>Input gambar wajib</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-DEFAULT border border-outline-variant/20 p-2.5 text-on-surface">
                    <input checked={toggleCondition} onChange={(event) => setToggleCondition(event.target.checked)} className="h-4 w-4 accent-primary" type="checkbox" />
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>Pilihan kondisi</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-DEFAULT border border-outline-variant/20 p-2.5 text-on-surface">
                    <input checked={toggleLogicCondition} onChange={(event) => setToggleLogicCondition(event.target.checked)} className="h-4 w-4 accent-primary" type="checkbox" />
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="material-symbols-outlined text-[16px] text-tertiary">functions</span>Logic Kondisi (Input Nilai &gt; Teks Otomatis)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-DEFAULT border border-outline-variant/20 p-2.5 text-on-surface">
                    <input checked={toggleTimestamp} onChange={(event) => setToggleTimestamp(event.target.checked)} className="h-4 w-4 accent-primary" type="checkbox" />
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="material-symbols-outlined text-[16px] text-primary">schedule</span>Tanggal, waktu &amp; GPS</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-DEFAULT border border-outline-variant/20 p-2.5 text-on-surface sm:col-span-2">
                    <input checked={toggleNotes} onChange={(event) => setToggleNotes(event.target.checked)} className="h-4 w-4 accent-primary" type="checkbox" />
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="material-symbols-outlined text-[16px]">description</span>Keterangan petugas</span>
                  </label>
                </div>
                {toggleCondition && (
                  <div className="flex flex-col gap-3 rounded-DEFAULT bg-surface-container-low p-3">
                    <h4 className="font-label-md text-label-md font-semibold text-on-surface">Daftar Pilihan Kondisi</h4>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input aria-label="Pilihan kondisi baru" className="min-w-0 flex-1 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface" placeholder="Tulis satu pilihan kondisi" value={newConditionOption} onChange={(event) => setNewConditionOption(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), handleAddConditionOption())} />
                      <button type="button" onClick={handleAddConditionOption} className="inline-flex items-center justify-center gap-1 rounded-DEFAULT bg-surface-container-high px-3 py-2 text-sm font-semibold text-on-surface hover:bg-secondary-container"><span className="material-symbols-outlined text-[16px]">add</span>Tambah pilihan</button>
                    </div>
                    {conditionOptions.length > 0 ? (
                      <ol className="flex flex-col gap-1.5">
                        {conditionOptions.map((option, index) => (
                          <li key={`${option}-${index}`} className="flex items-center justify-between gap-3 rounded-DEFAULT bg-surface-container-lowest px-3 py-2 text-sm text-on-surface">
                            <span>{index + 1}. {option}</span>
                            <button type="button" aria-label={`Hapus pilihan ${option}`} onClick={() => setConditionOptions((previous) => previous.filter((_, optionIndex) => optionIndex !== index))} className="text-outline hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="text-xs text-secondary">Belum ada Pilihan Kondisi.</p>}
                  </div>
                )}
                {toggleLogicCondition && (
                  <div className="flex flex-col gap-3 rounded-DEFAULT bg-surface-container-low p-3">
                    <div>
                      <h4 className="font-label-md text-label-md font-bold text-on-surface">Atur Skema Logic Kondisi</h4>
                      <p className="mt-0.5 text-xs text-secondary">Nilai petugas dicocokkan dengan rentang dan menghasilkan teks otomatis.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="flex flex-col gap-1 text-xs font-medium text-secondary">Min<input type="number" step="any" value={newLogicRange.min} onChange={(event) => setNewLogicRange((previous) => ({ ...previous, min: event.target.value }))} className="min-w-0 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface" /></label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-secondary">Max<input type="number" step="any" value={newLogicRange.max} onChange={(event) => setNewLogicRange((previous) => ({ ...previous, max: event.target.value }))} className="min-w-0 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface" /></label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-secondary">Output<input type="text" value={newLogicRange.output} onChange={(event) => setNewLogicRange((previous) => ({ ...previous, output: event.target.value }))} placeholder="Teks hasil otomatis" className="min-w-0 rounded-DEFAULT border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface" /></label>
                      <button type="button" onClick={handleAddLogicRange} className="inline-flex items-center justify-center gap-1 rounded-DEFAULT bg-secondary-container px-3 py-2 text-sm font-semibold text-on-secondary-container hover:bg-primary hover:text-on-primary sm:col-span-3"><span className="material-symbols-outlined text-[16px]">add</span>Tambah Rentang Logika Baru</button>
                    </div>
                    {logicRanges.length > 0 ? (
                      <ol className="flex flex-col gap-1.5">
                        {logicRanges.map((range, index) => (
                          <li key={range.id} className="flex items-start justify-between gap-3 rounded-DEFAULT bg-surface-container-lowest px-3 py-2 text-sm text-on-surface">
                            <span>{index + 1}. Rentang: {range.min} s/d {range.max}<br /><strong>Output:</strong> {range.output}</span>
                            <button type="button" aria-label={`Hapus rentang ${range.min} sampai ${range.max}`} onClick={() => setLogicRanges((previous) => previous.filter((item) => item.id !== range.id))} className="text-outline hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="text-xs text-secondary">Belum ada rentang logika.</p>}
                  </div>
                )}
              </div>
            )}
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
                {subtasks.length} Sub-Tugas · {allChecklistItems.length} Something To Do
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
