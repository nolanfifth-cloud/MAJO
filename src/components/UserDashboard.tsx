              <span>Akun Firebase terverifikasi</span>
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AuthView, ConditionLogicRange, PmItem } from '../types';
import { RiwayatSelesaiView } from './RiwayatSelesaiView';
import { ProfilTeknisiView } from './ProfilTeknisiView';
import { isCloudinaryConfigured, uploadPhotoToCloudinary } from '../services/cloudinary';
import { parseLegacyAreaDetails, PM_TYPE_DEFINITIONS, PmTypeKey } from '../services/workflowStore';
import {
  loadCompletedReportsFromFirestore,
  loadJobProgressForUserFromFirestore,
  loadJobsForUserFromFirestore,
  saveCompletedReportToFirestore,
  saveJobProgressToFirestore,
} from '../services/firestoreStore';
import {
  ListChecks,
  Clock,
  User,
  Radio,
  Bell,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
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
  Plus,
} from 'lucide-react';

interface DeviceItem {
  id: string;
  subtaskId: string;
  subtaskTitle: string;
  taskTitle: string;
  pmType?: string;
  hasPhoto: boolean;
  hasCondition: boolean;
  conditionMode?: 'options' | 'logic' | 'both';
  conditionOptions: string[];
  conditionLogic: ConditionLogicRange[];
  hasTimestamp: boolean;
  hasNotes: boolean;
  location: string;
  expanded: boolean;
  statusState: 'INITIAL' | 'DONE' | 'UPDATE';
  formData: {
    photo: string;
    photoName: string;
    status: string;
    conditionSelection?: string;
    conditionValue?: number;
    logicOutput?: string;
    keterangan: string;
    durasi: string;
    capturedAt: string;
  };
}

interface JobTabItem {
  id: number;
  sourceId: string;
  title: string;
  pmType?: string;
  dates?: string;
  regions?: string;
  targetAreaDetails?: PmItem['targetAreaDetails'];
  devices: DeviceItem[];
}

interface UserProgressNotification {
  id: string;
  jobId: number;
  title: string;
  jobTitle: string;
  area: string;
  completedCount: number;
  totalCount: number;
}

const getSavedFormData = (value: unknown): Partial<DeviceItem['formData']> => {
  if (!value || typeof value !== 'object') return {};
  const { latitude: _latitude, longitude: _longitude, ...formData } = value as Record<string, unknown>;
  return formData as Partial<DeviceItem['formData']>;
};
interface UserDashboardProps {
  onNavigate: (view: AuthView) => void;
  onLogout?: () => void;
  currentUser?: {
    uid?: string;
    username: string;
    name?: string;
    role?: 'admin' | 'user';
    location?: string;
    email?: string;
    portalAddress?: string;
    createdAt?: string;
  };
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onNavigate,
  onLogout,
  currentUser = {
    uid: undefined,
    username: '',
    name: '',
    role: 'user',
    location: '',
    email: '',
    portalAddress: '',
    createdAt: '',
  },
}) => {
  // Navigation & Sub-views state
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'riwayat' | 'profil'>('dashboard');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProgressNotificationMenu, setShowProgressNotificationMenu] = useState(false);
  const progressNotificationRef = useRef<HTMLDivElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Top Task Card Accordion
  const [isTaskCardExpanded, setIsTaskCardExpanded] = useState(true);

  // Active Job Tab
  const [currentJobId, setCurrentJobId] = useState<number>(0);
  const [activeSubtaskId, setActiveSubtaskId] = useState('');
  const [currentJobsPage, setCurrentJobsPage] = useState(1);
  const notificationStorageKey = `majo_user_read_progress_notifications_${currentUser.uid || currentUser.username || 'user'}`;
  const [readProgressNotificationIds, setReadProgressNotificationIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(notificationStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(notificationStorageKey, JSON.stringify(readProgressNotificationIds));
    } catch {
      // Notification read state is optional when local storage is unavailable.
    }
  }, [notificationStorageKey, readProgressNotificationIds]);

  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; isSuccess: boolean }>({
    show: false,
    message: '',
    isSuccess: true,
  });
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast.show) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !toastRef.current?.contains(event.target)) {
        setToast((previous) => ({ ...previous, show: false }));
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setToast((previous) => ({ ...previous, show: false }));
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [toast.show]);

  useEffect(() => {
    if (!showProgressNotificationMenu) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !progressNotificationRef.current?.contains(event.target)) {
        setShowProgressNotificationMenu(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProgressNotificationMenu(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showProgressNotificationMenu]);

  const triggerToast = (message: string, isSuccess = true) => {
    setToast({ show: true, message, isSuccess });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Jobs are loaded from real admin assignments; no demo records are seeded.
  const [jobsDatabase, setJobsDatabase] = useState<Record<number, JobTabItem>>({});
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [submittedJobIds, setSubmittedJobIds] = useState<Set<string>>(new Set());
  const isJobProgressReadyRef = useRef(false);
  const progressSaveErrorRef = useRef<string | null>(null);
  const hasAssignedJobs = Object.keys(jobsDatabase).length > 0;

  useEffect(() => {
    let cancelled = false;
    isJobProgressReadyRef.current = false;
    setIsJobsLoading(true);
    const userUid = currentUser.uid || '';
    Promise.allSettled([
      loadJobsForUserFromFirestore(),
      userUid ? loadJobProgressForUserFromFirestore(userUid) : Promise.resolve([]),
      userUid && currentUser.portalAddress
        ? loadCompletedReportsFromFirestore(userUid, currentUser.portalAddress)
        : Promise.resolve([]),
    ]).then(([jobsResult, progressResult, reportsResult]) => {
      if (jobsResult.status === 'rejected') throw jobsResult.reason;
      if (cancelled) return;
      const jobs = jobsResult.value;
      const progressSnapshots = progressResult.status === 'fulfilled' ? progressResult.value : [];
      const completedReports = reportsResult.status === 'fulfilled' ? reportsResult.value : [];
      isJobProgressReadyRef.current = progressResult.status === 'fulfilled';
      const submittedIds = new Set(completedReports.map((report) => String(report.jobId || '')).filter(Boolean));
      try {
        const localReports = JSON.parse(localStorage.getItem('majo_completed_reports') || '[]') as Record<string, unknown>[];
        localReports
          .filter((report) => String(report.submittedBy || '') === userUid)
          .forEach((report) => {
            const jobId = String(report.jobId || '');
            if (jobId) submittedIds.add(jobId);
          });
      } catch {
        // Ignore invalid local report cache.
      }
      setSubmittedJobIds(submittedIds);
      const progressByJobId = new Map(
        progressSnapshots.map((snapshot) => [String(snapshot.jobId || ''), snapshot])
      );
      const availableJobs = jobs.filter((job) => !submittedIds.has(job.id));
      const assignedJobs = availableJobs.reduce<Record<number, JobTabItem>>((result, job: PmItem, index) => {
        const savedProgress = progressByJobId.get(job.id);
        const savedDevices = Array.isArray(savedProgress?.devices)
          ? savedProgress.devices as Record<string, unknown>[]
          : [];
        const savedDevicesById = new Map(savedDevices.map((device) => [String(device.id || ''), device]));
        const hasSavedDeviceSnapshot = Array.isArray(savedProgress?.devices);
        const configuredDevices: DeviceItem[] = (job.modules || []).flatMap((module, moduleIndex): DeviceItem[] => {
          const subtaskId = `${job.id}_subtask_${moduleIndex + 1}`;
          const checklistItems = module.checklist?.length
            ? module.checklist
            : Array.from({ length: Math.max(1, module.itemCount || 1) }, () => null);
          return checklistItems.map((checklist, itemIndex) => {
            const taskTitle = checklist?.text || module.name;
            const pmType = checklist?.pmType || module.pmType;
            const conditionOptions = checklist?.conditionOptions?.length
              ? checklist.conditionOptions
              : checklist?.conditionText
                ? checklist.conditionText.replace(/^Kondisi:\s*/i, '').split('/').map((option) => option.trim()).filter(Boolean)
                : [];
            const id = `${subtaskId}_point_${itemIndex + 1}`;
            const savedDevice = savedDevicesById.get(id);
            const savedFormData = getSavedFormData(savedDevice?.formData);
            return {
              id,
              subtaskId,
              subtaskTitle: module.name,
              taskTitle,
              pmType,
              hasPhoto: checklist?.hasPhoto ?? true,
              hasCondition: checklist?.hasCondition ?? true,
              conditionMode: checklist?.conditionMode || 'options',
              conditionOptions,
              conditionLogic: checklist?.conditionLogic || [],
              hasTimestamp: checklist?.hasTimestamp ?? false,
              hasNotes: checklist?.hasNotes ?? Boolean(checklist?.notesText),
              location: currentUser.location || job.targetWilayahList?.[0] || job.regions,
              expanded: savedDevice
                ? savedDevice.expanded === true
                : moduleIndex === 0 && itemIndex === 0,
              statusState: savedDevice?.statusState === 'DONE' || savedDevice?.statusState === 'UPDATE'
                ? savedDevice.statusState as DeviceItem['statusState']
                : 'INITIAL',
              formData: {
                photo: '',
                photoName: '',
                status: '',
                keterangan: '',
                durasi: '',
                capturedAt: '',
                ...savedFormData,
              },
            };
          });
        });
        const configuredDeviceIds = new Set(configuredDevices.map((device) => device.id));
        const subtaskTemplates = new Map(configuredDevices.map((device) => [device.subtaskId, device]));
        const restoredAddedDevices: DeviceItem[] = savedDevices.flatMap((snapshot): DeviceItem[] => {
          const id = String(snapshot.id || '');
          const subtaskId = String(snapshot.subtaskId || '');
          const template = subtaskTemplates.get(subtaskId);
          if (!id || configuredDeviceIds.has(id) || !template) return [];
          const savedFormData = getSavedFormData(snapshot.formData);
          return [{
            ...template,
            id,
            taskTitle: typeof snapshot.taskTitle === 'string' ? snapshot.taskTitle : template.taskTitle,
            location: typeof snapshot.location === 'string' ? snapshot.location : '',
            expanded: snapshot.expanded === true,
            statusState: snapshot.statusState === 'DONE' || snapshot.statusState === 'UPDATE'
              ? snapshot.statusState as DeviceItem['statusState']
              : 'INITIAL',
            formData: { ...template.formData, ...savedFormData },
          }];
        });
        const activeDevices = hasSavedDeviceSnapshot
          ? configuredDevices.filter((device) => savedDevicesById.has(device.id))
          : configuredDevices;
        result[index + 1] = {
          id: index + 1,
          sourceId: job.id,
          title: job.title,
          pmType: job.modules?.[0]?.checklist?.[0]?.pmType || job.modules?.[0]?.pmType,
          dates: job.dates,
          regions: job.regions,
          targetAreaDetails: job.targetAreaDetails,
          devices: [...activeDevices, ...restoredAddedDevices],
        };
        return result;
      }, {});
      setJobsDatabase(assignedJobs);
      setCurrentJobId(assignedJobs[1] ? 1 : 0);
      setActiveSubtaskId(assignedJobs[1]?.devices[0]?.subtaskId || '');
      setCurrentJobsPage(1);
      const ancillaryLoadErrors = [
        progressResult.status === 'rejected'
          ? `progres: ${progressResult.reason instanceof Error ? progressResult.reason.message : 'gagal dimuat'}`
          : '',
        reportsResult.status === 'rejected'
          ? `riwayat penyelesaian: ${reportsResult.reason instanceof Error ? reportsResult.reason.message : 'gagal dimuat'}`
          : '',
      ].filter(Boolean);
      if (ancillaryLoadErrors.length > 0) {
        triggerToast(
          `PM berhasil dimuat, tetapi ${ancillaryLoadErrors.join('; ')}. Periksa koneksi, indeks, dan aturan Firebase.`,
          false
        );
      }
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'Periksa koneksi dan aturan akses Firebase.';
      triggerToast(`Gagal memuat penugasan dari Firebase: ${message}`, false);
      if (!cancelled) setJobsDatabase({});
    }).finally(() => {
      if (!cancelled) setIsJobsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser.uid, currentUser.location, currentUser.portalAddress]);

  useEffect(() => {
    const activeJob = jobsDatabase[currentJobId];
    if (!activeJob?.sourceId || !currentUser.uid || !isJobProgressReadyRef.current) return;
    void saveJobProgressToFirestore(
      activeJob.sourceId,
      currentUser.uid,
      currentUser.location || '',
      activeJob.devices,
      currentUser.portalAddress || '',
      {
        progress: activeJob.devices.length
          ? Math.round((activeJob.devices.filter((device) => device.statusState === 'DONE').length / activeJob.devices.length) * 100)
          : 0,
        doneCount: activeJob.devices.filter((device) => device.statusState === 'DONE').length,
        totalCount: activeJob.devices.length,
      },
      currentUser.name || currentUser.username
    ).then(() => {
      progressSaveErrorRef.current = null;
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Penyimpanan progres Firebase gagal.';
      if (progressSaveErrorRef.current !== message) {
        progressSaveErrorRef.current = message;
        triggerToast(`Progres belum tersimpan ke Firebase: ${message}`, false);
      }
    });
  }, [jobsDatabase, currentJobId, currentUser.uid, currentUser.location, currentUser.portalAddress, currentUser.name, currentUser.username]);

  // Submission & Confirmation modal states
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Progress and completion are scoped to the selected main job.
  const allDevices = useMemo(() => {
    return jobsDatabase[currentJobId]?.devices || [];
  }, [jobsDatabase, currentJobId]);

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

  const normalizeConditionText = (value: string) => value.toLowerCase().replace(/[_\s]+/g, ' ').trim();

  const isAbnormalConditionLabel = (label: string, pmType?: string) => {
    const normalizedLabel = normalizeConditionText(label);
    const definition = pmType && pmType in PM_TYPE_DEFINITIONS
      ? PM_TYPE_DEFINITIONS[pmType as PmTypeKey]
      : undefined;
    const configuredBadCondition = definition?.badConditions.some(
      (condition) => normalizeConditionText(condition) === normalizedLabel
    );
    const knownBadTerms = ['rusak', 'kotor', 'error', 'kadaluarsa', 'berantakan', 'perlu penataan'];
    const negativePhrase = /tidak\s+(bisa|dapat|layak|normal|baik|berfungsi|aktif|digunakan|dipakai|beroperasi|tersedia)/.test(normalizedLabel);
    return Boolean(configuredBadCondition)
      || knownBadTerms.some((condition) => normalizedLabel.includes(condition))
      || negativePhrase;
  };

  // Options helper for the 9 PM types
  const getConditionOptions = (pmType?: string, configuredOptions: string[] = []) => {
    if (configuredOptions.length > 0) {
      return configuredOptions.map((label, index) => {
        const value = label.trim().toLowerCase().replace(/\s+/g, '_');
        const normalizedLabel = normalizeConditionText(label);
        const isBad = isAbnormalConditionLabel(label, pmType);
        const isWarning = normalizedLabel.includes('kadaluarsa') || normalizedLabel.includes('perlu penataan');
        return {
          value,
          label,
          color: isBad ? (isWarning ? 'amber' : 'rose') : index === 0 ? 'emerald' : 'blue',
        };
      });
    }

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

  const isAbnormalStatus = (device: DeviceItem) => {
    const statuses = [device.formData.status, device.formData.conditionSelection, device.formData.logicOutput]
      .filter(Boolean)
      .map((status) => status!);
    return statuses.some((status) => isAbnormalConditionLabel(status, device.pmType));
  };

  const hasRequiredConditionResponse = (device: DeviceItem) => {
    const requiresOptions = device.conditionMode === 'options' || device.conditionMode === 'both' || !device.conditionMode;
    const requiresLogic = device.conditionMode === 'logic' || device.conditionMode === 'both';
    const hasOption = Boolean(device.formData.conditionSelection || device.formData.status);
    const hasLogicOutput = Boolean(device.formData.conditionValue !== undefined
      && (device.formData.logicOutput || (device.conditionMode === 'logic' && device.formData.status)));
    return (!requiresOptions || hasOption) && (!requiresLogic || hasLogicOutput);
  };

  // Submit and archive only this user's selected main job.
  const handleConfirmSubmitReport = async () => {
    const jobToSubmit = jobsDatabase[currentJobId];
    if (!jobToSubmit?.sourceId || !currentUser.uid || !currentUser.portalAddress) return;

    const submittedReport = {
      id: `PM-${new Date().getFullYear()}-${Date.now()}`,
      jobId: jobToSubmit.sourceId,
      submittedBy: currentUser.uid,
      portalId: currentUser.portalAddress,
      year: new Date().getFullYear(),
      title: jobToSubmit.title,
      completedAt:
        new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
        `, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      period: new Date().toLocaleDateString('id-ID'),
      region: currentUser.location || '',
      subJobsCount: new Set(jobToSubmit.devices.map((device) => device.subtaskId)).size,
      pointsCount: jobToSubmit.devices.length,
      subJobs: jobToSubmit.devices.map((device, index) => ({
        name: device.taskTitle || jobToSubmit.title,
        tag: `${device.subtaskId}-${index + 1}`,
        device: device.location || 'Perangkat Standar',
        duration: `${device.formData.durasi || '30'} Menit`,
        file: device.formData.photoName || 'foto_inspeksi.jpg',
        time: device.formData.capturedAt || '',
        conditionValue: device.formData.conditionValue,
        conditionSelection: device.formData.conditionSelection,
        logicOutput: device.formData.logicOutput,
        status: [
          device.conditionMode === 'logic'
            ? device.formData.logicOutput || device.formData.status
            : device.formData.conditionSelection || device.formData.status,
          device.formData.logicOutput,
        ]
          .filter(Boolean)
          .join(' · '),
        desc: device.formData.keterangan || 'Kondisi telah diperiksa normal sesuai standar operasional.',
      })),
    };

    try {
      await saveCompletedReportToFirestore(
        submittedReport as Record<string, unknown>,
        currentUser.uid,
        currentUser.portalAddress
      );
    } catch (error) {
      triggerToast(
        error instanceof Error ? `Laporan gagal disimpan: ${error.message}` : 'Laporan gagal disimpan ke server.',
        false
      );
      return;
    }

    try {
      const existing = localStorage.getItem('majo_completed_reports');
      const list = existing ? JSON.parse(existing) : [];
      localStorage.setItem('majo_completed_reports', JSON.stringify([submittedReport, ...list]));
    } catch {
      // Firestore is authoritative; local completed history is an optional cache.
    }

    setSubmittedJobIds((previous) => new Set(previous).add(jobToSubmit.sourceId));
    const remainingJobs = (Object.values(jobsDatabase) as JobTabItem[])
      .filter((job) => job.sourceId !== jobToSubmit.sourceId);
    const reindexedJobs = remainingJobs.reduce<Record<number, JobTabItem>>((result, job, index) => {
      result[index + 1] = { ...job, id: index + 1 };
      return result;
    }, {});
    setJobsDatabase(reindexedJobs);
    setCurrentJobId(reindexedJobs[1]?.id || 0);
    setActiveSubtaskId(reindexedJobs[1]?.devices[0]?.subtaskId || '');
    setCurrentJobsPage(1);
    setShowSubmitModal(false);
    triggerToast('Laporan PM 100% Lengkap berhasil diserahkan ke Admin Wilayah!', true);
  };

  // Current active job
  const activeJob = jobsDatabase[currentJobId] || {
    id: currentJobId,
    sourceId: '',
    title: 'Belum ada penugasan dari admin',
    dates: '',
    regions: '',
    devices: [],
  };
  const isSubmitted = submittedJobIds.has(activeJob.sourceId);
  const activeSubtask = activeJob.devices.find((device) => device.subtaskId === activeSubtaskId)
    || activeJob.devices[0];
  const subtaskGroups = Array.from(
    new Map(activeJob.devices.map((device) => [device.subtaskId, device])).values()
  );
  const activeSubtaskDevices = activeSubtask
    ? activeJob.devices.filter((device) => device.subtaskId === activeSubtask.subtaskId)
    : [];
  const allAssignedJobs = Object.values(jobsDatabase) as JobTabItem[];
  const jobsPerPage = 5;
  const totalJobsPages = Math.max(1, Math.ceil(allAssignedJobs.length / jobsPerPage));
  const currentPageJobs = allAssignedJobs.slice((currentJobsPage - 1) * jobsPerPage, currentJobsPage * jobsPerPage);
  const visibleJobs = [
    ...currentPageJobs.filter((job) => job.id !== currentJobId),
    ...currentPageJobs.filter((job) => job.id === currentJobId),
  ];

  const progressNotifications = useMemo<UserProgressNotification[]>(() => allAssignedJobs.map((job) => {
    const totalCount = job.devices.length;
    const completedCount = job.devices.filter((device) => device.statusState === 'DONE').length;
    return {
      id: `${job.sourceId}_${completedCount}_${totalCount}`,
      jobId: job.id,
      title: totalCount > 0 && completedCount === totalCount
        ? 'Checklist selesai, siap dikirim'
        : completedCount > 0
          ? 'Progress PM diperbarui'
          : 'Penugasan siap dikerjakan',
      jobTitle: job.title,
      area: job.regions || currentUser.location || 'Lokasi belum ditentukan',
      completedCount,
      totalCount,
    };
  }), [allAssignedJobs, currentUser.location]);
  const unreadProgressNotificationCount = progressNotifications.filter(
    (notification) => !readProgressNotificationIds.includes(notification.id)
  ).length;

  const markAllProgressNotificationsRead = () => {
    setReadProgressNotificationIds(progressNotifications.map((notification) => notification.id));
  };

  const openProgressNotification = (notification: UserProgressNotification) => {
    setReadProgressNotificationIds((previous) => previous.includes(notification.id)
      ? previous
      : [...previous, notification.id]);
    setActiveMenu('dashboard');
    setCurrentJobId(notification.jobId);
    setActiveSubtaskId(jobsDatabase[notification.jobId]?.devices[0]?.subtaskId || '');
    setIsTaskCardExpanded(true);
    setShowProgressNotificationMenu(false);
  };

  const goToJobsPage = (page: number) => {
    const nextPage = Math.max(1, Math.min(totalJobsPages, page));
    setCurrentJobsPage(nextPage);
    const firstJob = allAssignedJobs.slice((nextPage - 1) * jobsPerPage, nextPage * jobsPerPage)[0];
    if (firstJob) {
      setCurrentJobId(firstJob.id);
      setActiveSubtaskId(firstJob.devices[0]?.subtaskId || '');
    }
    setIsTaskCardExpanded(true);
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

  const addDeviceToActiveSubtask = () => {
    if (!activeSubtask) return;
    const template = activeSubtaskDevices[0];
    if (!template) return;
    const newDevice: DeviceItem = {
      ...template,
      id: `${activeSubtask.subtaskId}_point_${crypto.randomUUID()}`,
      location: '',
      expanded: true,
      statusState: 'INITIAL',
      formData: {
        photo: '',
        photoName: '',
        status: '',
        conditionSelection: '',
        conditionValue: undefined,
        logicOutput: '',
        keterangan: '',
        durasi: '',
        capturedAt: '',
      },
    };
    setJobsDatabase((previous) => {
      const job = previous[currentJobId];
      if (!job) return previous;
      return {
        ...previous,
        [currentJobId]: { ...job, devices: [...job.devices, newDevice] },
      };
    });
  };

  // Prompt delete device
  const promptDeleteDevice = (deviceId: string) => {
    setDeleteTargetId(deviceId);
  };

  // Confirm delete device
  const confirmDeleteDevice = () => {
    if (!deleteTargetId) return;
    const targetDevice = activeJob.devices.find((device) => device.id === deleteTargetId);
    const pointsInSubtask = targetDevice
      ? activeJob.devices.filter((device) => device.subtaskId === targetDevice.subtaskId)
      : [];
    if (pointsInSubtask.length <= 1) {
      setDeleteTargetId(null);
      triggerToast('Setiap sub-tugas harus memiliki minimal satu titik perangkat.', false);
      return;
    }
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
  const handleActionClick = async (deviceId: string) => {
    const device = activeJob.devices.find((d) => d.id === deviceId);
    if (!device) return;

    const isNegative = isAbnormalStatus(device);

    if (device.statusState === 'INITIAL') {
      if (!device.location.trim()) {
        triggerToast('Mohon ketik Lokasi Perangkat terlebih dahulu!', false);
        return;
      }
      if (device.hasCondition && !hasRequiredConditionResponse(device)) {
        triggerToast(device.conditionMode === 'both'
          ? 'Lengkapi Pilihan Kondisi dan nilai Logic Kondisi terlebih dahulu.'
          : device.conditionMode === 'logic'
            ? 'Masukkan nilai yang berada dalam Rentang Logic Kondisi.'
            : 'Mohon pilih Status / Kondisi perangkat terlebih dahulu!', false);
        return;
      }
      if (device.hasPhoto && !device.formData.photo) {
        triggerToast(`Foto bukti untuk "${device.taskTitle}" wajib diunggah.`, false);
        return;
      }
      if (device.hasNotes && !device.formData.keterangan.trim()) {
        triggerToast(`Keterangan untuk "${device.taskTitle}" wajib diisi.`, false);
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
      const responseMetadata = await captureResponseMetadata(device);
      updateDevice(deviceId, {
        statusState: 'DONE',
        formData: { ...device.formData, ...responseMetadata },
      });
      triggerToast(`Pemeriksaan ${device.location || 'Perangkat'} disimpan (Done)!`, true);
    } else if (device.statusState === 'DONE') {
      // Transition to UPDATE - unlocks device for editing, while progress percentage stays unchanged!
      updateDevice(deviceId, { statusState: 'UPDATE' });
      triggerToast('Mode edit aktif. Perbaiki data lalu klik tombol Update.', true);
    } else if (device.statusState === 'UPDATE') {
      if (device.hasCondition && !hasRequiredConditionResponse(device)) {
        triggerToast(device.conditionMode === 'both'
          ? 'Lengkapi Pilihan Kondisi dan nilai Logic Kondisi terlebih dahulu.'
          : device.conditionMode === 'logic'
            ? 'Masukkan nilai yang berada dalam Rentang Logic Kondisi.'
            : 'Mohon pilih Status / Kondisi perangkat terlebih dahulu!', false);
        return;
      }
      if (device.hasPhoto && !device.formData.photo) {
        triggerToast(`Foto bukti untuk "${device.taskTitle}" wajib diunggah.`, false);
        return;
      }
      if (device.hasNotes && !device.formData.keterangan.trim()) {
        triggerToast(`Keterangan untuk "${device.taskTitle}" wajib diisi.`, false);
        return;
      }
      if (isNegative && !device.formData.keterangan.trim()) {
        triggerToast('Kondisi perangkat ini memerlukan kolom Keterangan detail penanganan!', false);
        return;
      }
      // Save update - re-locks device and transitions back to DONE (button displays EDIT)
      const responseMetadata = await captureResponseMetadata(device);
      updateDevice(deviceId, {
        statusState: 'DONE',
        formData: { ...device.formData, ...responseMetadata },
      });
      triggerToast('Data laporan berhasil diperbarui (Update sukses)!', true);
    }
  };

  const captureResponseMetadata = async (device: DeviceItem) => {
    return { capturedAt: device.hasTimestamp ? new Date().toISOString() : '' };
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
    if (!file) return;
    if (!isCloudinaryConfigured) {
      triggerToast('Upload foto belum tersedia. Admin perlu mengonfigurasi Cloudinary.', false);
      e.target.value = '';
      return;
    }
    try {
      const photoUrl = await uploadPhotoToCloudinary(file);
      updateDeviceForm(deviceId, { photo: photoUrl, photoName: file.name });
      triggerToast('Foto berhasil disimpan ke Cloudinary!');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Upload foto gagal.', false);
    } finally {
      e.target.value = '';
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
        <div ref={toastRef} className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-4">
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
                src="/assets/majo-logo.png"
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
              Unit Operasi: <strong className="text-slate-900 font-semibold">{currentUser.location || 'Belum ditentukan'}</strong>
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
              <span>Akun Firebase terverifikasi</span>
            </div>
          )}

          <div className="relative" ref={progressNotificationRef}>
            <button
              aria-label={`Notifikasi progress PM${unreadProgressNotificationCount > 0 ? `, ${unreadProgressNotificationCount} belum dibaca` : ''}`}
              aria-expanded={showProgressNotificationMenu}
              onClick={() => setShowProgressNotificationMenu((open) => !open)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
              type="button"
              title="Notifikasi progress PM"
            >
              <Bell className="w-4 h-4" />
              {unreadProgressNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                  {unreadProgressNotificationCount > 99 ? '99+' : unreadProgressNotificationCount}
                </span>
              )}
            </button>
            {showProgressNotificationMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Progress PM</p>
                    <p className="text-[11px] text-slate-500">Status checklist pekerjaan Anda</p>
                  </div>
                  <button
                    type="button"
                    onClick={markAllProgressNotificationsRead}
                    disabled={unreadProgressNotificationCount === 0}
                    className="shrink-0 text-[11px] font-semibold text-blue-700 hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
                  >
                    Tandai dibaca
                  </button>
                </div>
                <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
                  {progressNotifications.length > 0 ? (
                    <div className="space-y-1">
                      {progressNotifications.map((notification) => {
                        const isUnread = !readProgressNotificationIds.includes(notification.id);
                        const progress = notification.totalCount
                          ? Math.round((notification.completedCount / notification.totalCount) * 100)
                          : 0;
                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => openProgressNotification(notification)}
                            className={`w-full rounded-lg p-3 text-left transition-colors hover:bg-slate-50 ${isUnread ? 'bg-blue-50/70' : 'bg-transparent'}`}
                          >
                            <span className="flex items-start gap-2.5">
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? 'bg-blue-600' : 'bg-transparent'}`} />
                              <span className="material-symbols-outlined text-[18px] text-blue-700">assignment</span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-slate-900">{notification.title}</span>
                                <span className="mt-1 block truncate text-[11px] text-slate-600">{notification.jobTitle} · {notification.area}</span>
                                <span className="mt-1 block text-[10px] text-slate-500">Checklist {notification.completedCount}/{notification.totalCount} · {progress}%</span>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Bell className="mx-auto h-6 w-6 text-slate-400" />
                      <p className="mt-2 text-xs font-semibold text-slate-500">Belum ada progress PM.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
                    Field User • {currentUser.location || 'Lokasi belum ditentukan'}
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

                {isJobsLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Memuat penugasan admin...</div>
                ) : hasAssignedJobs ? (
                  <div className="space-y-3">
                    {visibleJobs.map((job) => {
                      const isActive = job.id === currentJobId;
                      const completed = job.devices.filter((device) => device.statusState === 'DONE').length;
                      const percentage = job.devices.length ? Math.round((completed / job.devices.length) * 100) : 0;
                      const displayAreas = job.targetAreaDetails?.length
                        ? job.targetAreaDetails
                        : parseLegacyAreaDetails(job.regions);
                      return (
                        <button
                          key={job.sourceId}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setIsTaskCardExpanded((expanded) => !expanded);
                            } else {
                              setCurrentJobId(job.id);
                              setActiveSubtaskId(job.devices[0]?.subtaskId || '');
                              setIsTaskCardExpanded(true);
                            }
                          }}
                          className={`w-full rounded-2xl border bg-white p-5 text-left shadow-xs transition-all cursor-pointer ${
                            isActive ? 'border-slate-900 ring-1 ring-slate-900/10' : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                  {isActive ? 'Job Dipilih' : 'Tugas Admin'}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">ID: {job.sourceId}</span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                  <Clock className="h-3 w-3" /> Tenggat mengikuti penugasan admin
                                </span>
                              </div>
                              <h2 className="text-lg font-extrabold text-slate-900 md:text-xl">{job.title}</h2>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarCheck className="h-3.5 w-3.5 text-slate-400" /> Rentang Waktu: <strong>{job.dates || 'Belum ditentukan'}</strong>
                                </span>
                                <span className="inline-flex items-start gap-1.5">
                                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  {displayAreas.length ? (
                                    <span className="flex flex-col gap-1">
                                      {displayAreas.map((area) => area.subLocations.length ? (
                                        area.subLocations.map((subLocation) => (
                                          <span key={`${area.location}-${subLocation.name}`}>
                                            <strong>Area tugas:</strong> {area.location} → {subLocation.name}
                                            {subLocation.places.length > 0 && (
                                              <span className="block pl-2 text-slate-500">
                                                <strong>Tempat:</strong> {subLocation.places.join(', ')}
                                              </span>
                                            )}
                                          </span>
                                        ))
                                      ) : (
                                        <span key={area.location}><strong>Area tugas:</strong> {area.location}</span>
                                      ))}
                                    </span>
                                  ) : (
                                    <span><strong>Area tugas:</strong> {job.regions || currentUser.location || 'Belum ditentukan'}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-5 border-t border-slate-100 pt-3 lg:justify-end lg:border-0 lg:pt-0">
                              <div className="text-right">
                                <div className="flex items-baseline justify-end gap-1.5">
                                  <span className="text-2xl font-black text-slate-900">{percentage}%</span>
                                  <span className="text-xs font-semibold text-slate-500">Selesai</span>
                                </div>
                                <div className="mt-1.5 h-2 w-36 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                  <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${percentage}%` }} />
                                </div>
                                <span className="mt-1 block text-[10px] text-slate-400">
                                  {isActive && isTaskCardExpanded ? 'Detail job terbuka' : 'Klik untuk membuka job ini'}
                                </span>
                              </div>
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                {isActive && isTaskCardExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">Belum Ada Tugas</span>
                    <h2 className="mt-2 text-lg font-extrabold text-slate-900">Admin belum memberikan penugasan PM.</h2>
                    <p className="mt-1 text-sm text-slate-500">Pekerjaan akan tampil di sini setelah admin menugaskan job ke wilayah Anda.</p>
                  </div>
                )}
              </div>

              {/* DETAIL JOBS WORKSPACE (inspection-section) */}
              {!isJobsLoading && !hasAssignedJobs && isTaskCardExpanded && (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <Layers className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <h3 className="text-base font-bold text-slate-800">Belum ada penugasan dari admin</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Job yang ditugaskan ke wilayah {currentUser.location || 'Anda'} akan muncul di sini.
                  </p>
                </section>
              )}

              {hasAssignedJobs && isTaskCardExpanded && (
                <section className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 md:p-7 space-y-6 transition-all duration-300">
                  {/* Header Detail & Instruksi */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-800" />
                        <span>Checklist Pekerjaan</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pilih satu job utama, lalu kerjakan sub-tugas checklist di dalamnya.
                      </p>
                    </div>
                    <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      Mode Input Teknisi: Real-time Autosave
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        SUB-TUGAS CHECKLIST:
                      </span>
                      <span className="text-xs text-slate-700 font-semibold">{activeJob.title}</span>
                    </div>
                    {subtaskGroups.length > 0 ? (
                      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
                        {subtaskGroups.map((device, index) => {
                          const isSelected = device.subtaskId === activeSubtask?.subtaskId;
                          const points = activeJob.devices.filter((point) => point.subtaskId === device.subtaskId);
                          return (
                            <button
                              key={device.id}
                              type="button"
                              onClick={() => {
                                setActiveSubtaskId(device.subtaskId);
                                setJobsDatabase((previous) => {
                                  const job = previous[currentJobId];
                                  if (!job) return previous;
                                  const firstPoint = job.devices.find((point) => point.subtaskId === device.subtaskId);
                                  return {
                                    ...previous,
                                    [currentJobId]: {
                                      ...job,
                                      devices: job.devices.map((point) =>
                                        point.id === firstPoint?.id ? { ...point, expanded: true } : point
                                      ),
                                    },
                                  };
                                });
                              }}
                              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-slate-900 bg-white text-slate-900 shadow-xs'
                                  : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                              }`}
                            >
                              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {index + 1}
                              </span>
                              <span>{device.subtaskTitle}</span>
                              <span className={`h-2 w-2 rounded-full ${points.length > 0 && points.every((point) => point.statusState === 'DONE') ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Job ini belum memiliki sub-tugas checklist.</p>
                    )}
                  </div>

                  {/* Form sub-tugas terpilih */}
                  <div className="space-y-5">
                    {activeSubtaskDevices.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">
                          Belum ada Something To Do pada {activeSubtask?.subtaskTitle || activeJob.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Tambahkan titik perangkat pada sub-tugas aktif ini.
                        </p>
                      </div>
                    ) : (
                      activeSubtaskDevices.map((device) => {
                        const isExpanded = device.expanded;
                        const isLocked = device.statusState === 'DONE';
                        const isNegative = isAbnormalStatus(device);
                        const conditionOptions = device.hasCondition
                          ? getConditionOptions(device.pmType, device.conditionOptions)
                          : [];
                        const matchedLogicRange = device.conditionLogic.find((range) =>
                          device.formData.conditionValue !== undefined
                          && device.formData.conditionValue >= range.min
                          && device.formData.conditionValue <= range.max
                        );

                        return (
                          <div
                            key={device.id}
                            className={`border rounded-2xl p-4 md:p-5 transition-all duration-300 ${
                              isExpanded
                                ? 'border-slate-300 bg-white shadow-xs'
                                : 'border-slate-200 bg-slate-50/70'
                            }`}
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{device.taskTitle}</h4>
                                <p className="text-[11px] text-slate-500">Titik Perangkat {activeSubtaskDevices.indexOf(device) + 1}</p>
                              </div>
                              {device.hasTimestamp && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                                  <Clock className="h-3 w-3" /> Tanggal &amp; Waktu otomatis
                                </span>
                              )}
                            </div>
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

                                <button
                                  type="button"
                                  onClick={addDeviceToActiveSubtask}
                                  title="Tambah titik perangkat"
                                  aria-label="Tambah titik perangkat"
                                  className="w-8 h-8 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
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
                                  {/* 1. Foto bukti */}
                                  {device.hasPhoto && <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
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
                                          accept="image/jpeg,image/png,image/webp"
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
                                  </div>}

                                  {/* 2. Status / Kondisi Lapangan */}
                                  {device.hasCondition && <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <div className="w-36 text-xs font-bold text-slate-700 flex justify-between items-center shrink-0">
                                      <span>Status</span>
                                      <span className="font-black text-slate-400 mr-2">:</span>
                                    </div>
                                    <div className="flex-1 flex flex-wrap items-center gap-2.5">
                                      {(device.conditionMode === 'options' || device.conditionMode === 'both' || !device.conditionMode) && conditionOptions.map((cond) => {
                                        const selectedCondition = device.formData.conditionSelection || device.formData.status;
                                        const isSelected = selectedCondition.toLowerCase() === cond.value.toLowerCase();
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
                                              onChange={() => updateDeviceForm(device.id, {
                                                status: cond.value,
                                                conditionSelection: cond.value,
                                              })}
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
                                      {(device.conditionMode === 'logic' || device.conditionMode === 'both') && (
                                        <div className="flex w-full flex-col gap-2">
                                          <label className="flex max-w-xs flex-col gap-1 text-xs font-semibold text-slate-600">
                                            Input Nilai
                                            <input
                                              type="number"
                                              step="any"
                                              value={device.formData.conditionValue ?? ''}
                                              disabled={isLocked}
                                              onChange={(event) => {
                                                const rawValue = event.target.value;
                                                const parsedValue = Number(rawValue);
                                                const conditionValue = rawValue === '' || !Number.isFinite(parsedValue)
                                                  ? undefined
                                                  : parsedValue;
                                                const matchedRange = conditionValue === undefined
                                                  ? undefined
                                                  : device.conditionLogic.find((range) => conditionValue >= range.min && conditionValue <= range.max);
                                                updateDeviceForm(device.id, {
                                                  conditionValue,
                                                  logicOutput: matchedRange?.output || '',
                                                  ...(device.conditionMode === 'logic' ? { status: matchedRange?.output || '' } : {}),
                                                });
                                              }}
                                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            />
                                          </label>
                                          <p className={`text-xs ${matchedLogicRange ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                                            Teks otomatis: {matchedLogicRange?.output || 'Nilai belum masuk rentang yang diatur.'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>}

                                  {/* 3. Keterangan */}
                                  {(device.hasNotes || isNegative) && <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
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
                                          isNegative
                                            ? 'Wajib ketik rincian temuan kerusakan / ketidaknormalan & tindakan penanganan...'
                                            : 'Keterangan petugas di lapangan...'
                                        }
                                      />
                                      <p
                                        className={`text-[10px] ${isNegative || device.hasNotes ? 'text-rose-600 font-bold' : 'text-slate-400'}`}
                                      >
                                        {isNegative
                                          ? 'Kondisi tidak normal: keterangan penanganan wajib diisi.'
                                          : device.hasNotes
                                            ? 'Keterangan petugas wajib diisi sesuai pengaturan admin.'
                                            : 'Keterangan wajib diisi untuk kondisi tidak normal.'}
                                      </p>
                                    </div>
                                  </div>}

                                  {device.hasTimestamp && device.formData.capturedAt && (
                                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                      <span className="font-semibold">Tanggal &amp; Waktu: {new Date(device.formData.capturedAt).toLocaleString('id-ID')}</span>
                                    </div>
                                  )}

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

              {hasAssignedJobs && totalJobsPages > 1 && (
                <nav aria-label="Pagination job" className="flex items-center justify-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => goToJobsPage(currentJobsPage - 1)}
                    disabled={currentJobsPage === 1}
                    aria-label="Halaman sebelumnya"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalJobsPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToJobsPage(page)}
                      aria-current={page === currentJobsPage ? 'page' : undefined}
                      aria-label={`Halaman ${page}`}
                      className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-semibold ${
                        page === currentJobsPage
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => goToJobsPage(currentJobsPage + 1)}
                    disabled={currentJobsPage === totalJobsPages}
                    aria-label="Halaman berikutnya"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="ml-2 text-xs text-slate-500">{allAssignedJobs.length} job</span>
                </nav>
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
              location={currentUser.location}
              portalAddress={currentUser.portalAddress}
              createdAt={currentUser.createdAt}
              onTriggerToast={triggerToast}
              onOpenLogoutModal={() => setShowLogoutModal(true)}
            />
          )}

          {/* ===================================================================== */}
          {/* VIEW C: RIWAYAT SELESAI */}
          {/* ===================================================================== */}
          {activeMenu === 'riwayat' && (
            <RiwayatSelesaiView
              onTriggerToast={triggerToast}
              userUid={currentUser.uid}
              portalId={currentUser.portalAddress}
            />
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
                  onLogout?.();
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
                <span className="font-semibold text-slate-900">{activeJob.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lokasi Petugas:</span>
                <span className="font-semibold text-slate-900">
                  {currentUser?.location || 'Belum ditentukan'}
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
