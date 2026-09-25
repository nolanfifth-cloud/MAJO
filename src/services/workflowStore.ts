import { PmItem, RegionConfig, RegisteredAccount } from '../types';

export type PmTypeKey =
  | 'suhu_ruangan'
  | 'pac_ac'
  | 'ups'
  | 'pembersihan'
  | 'fire_extinguisher'
  | 'ems'
  | 'vicon'
  | 'rack_server'
  | 'rack_wallmount';

export interface PmTypeDefinition {
  key: PmTypeKey;
  label: string;
  photoLabel: string;
  conditions: string[];
  notesLabel: string;
  notesRequiredOnBadCondition: boolean;
  badConditions: string[];
}

export const PM_TYPE_DEFINITIONS: Record<PmTypeKey, PmTypeDefinition> = {
  suhu_ruangan: {
    key: 'suhu_ruangan',
    label: 'Suhu Ruangan Server',
    photoLabel: 'Foto Ruang Server',
    conditions: ['Normal', 'Rusak'],
    notesLabel: 'Keterangan (Wajib diisi jika rusak)',
    notesRequiredOnBadCondition: true,
    badConditions: ['Rusak'],
  },
  pac_ac: {
    key: 'pac_ac',
    label: 'PAC & AC Gedung',
    photoLabel: 'Foto PAC / AC',
    conditions: ['Normal', 'Rusak'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Rusak'],
  },
  ups: {
    key: 'ups',
    label: 'UPS',
    photoLabel: 'Foto UPS',
    conditions: ['Normal', 'Rusak'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Rusak'],
  },
  pembersihan: {
    key: 'pembersihan',
    label: 'Pembersihan Ruang Server',
    photoLabel: 'Foto Kebersihan',
    conditions: ['Bersih', 'Kotor'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Kotor'],
  },
  fire_extinguisher: {
    key: 'fire_extinguisher',
    label: 'Fire Extinguisher',
    photoLabel: 'Foto APAR / Tabung',
    conditions: ['Baik', 'Kadaluarsa', 'Rusak'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Kadaluarsa', 'Rusak'],
  },
  ems: {
    key: 'ems',
    label: 'EMS',
    photoLabel: 'Foto Panel EMS',
    conditions: ['Aktif', 'Error'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Error'],
  },
  vicon: {
    key: 'vicon',
    label: 'Perangkat Vicon',
    photoLabel: 'Foto Kamera / Mic Vicon',
    conditions: ['Normal', 'Rusak'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Rusak'],
  },
  rack_server: {
    key: 'rack_server',
    label: 'Kondisi Ruang dan Rack Server',
    photoLabel: 'Foto Rack Server',
    conditions: ['Rapi', 'Normal', 'Berantakan'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Berantakan'],
  },
  rack_wallmount: {
    key: 'rack_wallmount',
    label: 'Kondisi Ruang & Rack Wallmount',
    photoLabel: 'Foto Wallmount',
    conditions: ['Rapi', 'Perlu Penataan'],
    notesLabel: 'Keterangan',
    notesRequiredOnBadCondition: true,
    badConditions: ['Perlu Penataan'],
  },
};

export interface DeviceInspectionItem {
  id: string;
  location: string;
  expanded: boolean;
  statusState: 'INITIAL' | 'DONE' | 'UPDATE';
  pmType: PmTypeKey;
  formData: {
    photo: string;
    photoName: string;
    condition: string;
    keterangan: string;
    durasi: string;
  };
}

export interface UserJobTab {
  id: number;
  title: string;
  pmType: PmTypeKey;
  devices: DeviceInspectionItem[];
}

export interface WorkflowJob {
  id: string;
  code: string;
  title: string;
  dateType: 'single' | 'range';
  singleDate?: string;
  startDate?: string;
  endDate?: string;
  dates: string;
  areaType: 'wilayah' | 'grup' | 'all';
  targetArea: string; // e.g. "Medan - Hub Operasional" or "SOR 1 (Sumatera Bagian Utara)" or "Semua Wilayah"
  targetWilayahList: string[]; // List of single Wilayah that should receive this job
  pic: string;
  picRole: string;
  subJobs: {
    id: number;
    title: string;
    pmType: PmTypeKey;
  }[];
  isSubmitted: boolean;
  submittedAt?: string;
  submittedBy?: string;
  submittedWilayah?: string;
  progress: number;
  devicesData?: Record<number, DeviceInspectionItem[]>;
}

export interface PortalMasterConfig {
  portalAddress: string;
  portalLink: string;
  isActivated: boolean;
  masterWilayah: string[];
  masterGroups: RegionConfig[];
}

const DEFAULT_PORTAL_ADDRESS = 'pt-majo-logistik-indo.majo.id';
const DEFAULT_PORTAL_LINK = 'pt-majo-logistik-indo.majo.id';

export const INITIAL_MASTER_WILAYAH: string[] = [];
export const INITIAL_MASTER_GROUPS: RegionConfig[] = [];
export const INITIAL_WORKFLOW_JOBS: WorkflowJob[] = [];

export function normalizePortalAddress(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\s+/g, '');
}

export function getPortalStorageKey(portalAddress?: string): string {
  const target = normalizePortalAddress(portalAddress || getActivePortalAddress() || DEFAULT_PORTAL_ADDRESS);
  if (!target) return 'majo_portal_config';
  return `majo_portal_config_${target.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function getCurrentSessionIdentity(): string {
  try {
    const session = localStorage.getItem('majo_session');
    if (!session) return '';
    const parsed = JSON.parse(session) as { username?: string; uid?: string };
    if (parsed.uid) return `uid_${parsed.uid}`;
    if (parsed.username) return `user_${parsed.username.toLowerCase()}`;
  } catch {
    // Ignore invalid storage values.
  }
  return '';
}

export function getActivePortalAddress(userKey?: string): string {
  const identity = userKey || getCurrentSessionIdentity();

  try {
    if (identity) {
      const scoped = localStorage.getItem(`majo_active_portal_address_${identity}`);
      if (scoped) return normalizePortalAddress(scoped);

      const session = localStorage.getItem('majo_session');
      if (session) {
        const parsed = JSON.parse(session) as { portalAddress?: string };
        if (parsed.portalAddress) return normalizePortalAddress(parsed.portalAddress);
      }
    }

    const storedActive = localStorage.getItem('majo_active_portal_address');
    if (storedActive) return normalizePortalAddress(storedActive);

    const session = localStorage.getItem('majo_session');
    if (session) {
      const parsed = JSON.parse(session) as { portalAddress?: string };
      if (parsed.portalAddress) return normalizePortalAddress(parsed.portalAddress);
    }
  } catch {
    // Ignore invalid storage values.
  }
  return DEFAULT_PORTAL_ADDRESS;
}

export function setActivePortalAddress(portalAddress: string, userKey?: string) {
  const valid = normalizePortalAddress(portalAddress || DEFAULT_PORTAL_ADDRESS);
  if (!valid) return;

  const identity = userKey || getCurrentSessionIdentity();

  try {
    if (identity) {
      localStorage.setItem(`majo_active_portal_address_${identity}`, valid);
      return;
    }
    localStorage.setItem('majo_active_portal_address', valid);
  } catch {
    // Ignore invalid storage values.
  }
}

export function getPortalConfigForAddress(portalAddress?: string): PortalMasterConfig {
  const targetAddress = normalizePortalAddress(portalAddress || getActivePortalAddress() || DEFAULT_PORTAL_ADDRESS) || DEFAULT_PORTAL_ADDRESS;

  try {
    const scopedKey = getPortalStorageKey(targetAddress);
    const scopedRaw = localStorage.getItem(scopedKey);
    if (scopedRaw) {
      const parsed = JSON.parse(scopedRaw) as PortalMasterConfig;
      return {
        portalAddress: normalizePortalAddress(parsed.portalAddress || targetAddress) || targetAddress,
        portalLink: normalizePortalAddress(parsed.portalLink || parsed.portalAddress || targetAddress) || targetAddress,
        isActivated: Boolean(parsed.isActivated),
        masterWilayah: Array.isArray(parsed.masterWilayah) ? parsed.masterWilayah : [],
        masterGroups: Array.isArray(parsed.masterGroups) ? parsed.masterGroups : [],
      };
    }

    const legacyRaw = localStorage.getItem('majo_portal_config');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as PortalMasterConfig;
      const legacyAddress = normalizePortalAddress(parsed.portalAddress || targetAddress);
      if (!legacyAddress || legacyAddress === targetAddress) {
        return {
          portalAddress: legacyAddress || targetAddress,
          portalLink: normalizePortalAddress(parsed.portalLink || parsed.portalAddress || targetAddress) || targetAddress,
          isActivated: Boolean(parsed.isActivated),
          masterWilayah: Array.isArray(parsed.masterWilayah) ? parsed.masterWilayah : [],
          masterGroups: Array.isArray(parsed.masterGroups) ? parsed.masterGroups : [],
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    portalAddress: targetAddress,
    portalLink: targetAddress,
    isActivated: false,
    masterWilayah: INITIAL_MASTER_WILAYAH,
    masterGroups: INITIAL_MASTER_GROUPS,
  };
}

// Helper methods with localStorage fallback
export function getPortalConfig(): PortalMasterConfig {
  const activeAddress = getActivePortalAddress();
  const config = getPortalConfigForAddress(activeAddress);
  return {
    ...config,
    portalAddress: normalizePortalAddress(config.portalAddress || activeAddress) || activeAddress,
    portalLink: normalizePortalAddress(config.portalLink || config.portalAddress || activeAddress) || activeAddress,
  };
}

export function savePortalConfig(config: PortalMasterConfig, portalAddressOverride?: string) {
  const address = normalizePortalAddress(portalAddressOverride || config.portalAddress || getActivePortalAddress() || DEFAULT_PORTAL_ADDRESS) || DEFAULT_PORTAL_ADDRESS;
  const next = {
    ...config,
    portalAddress: address,
    portalLink: normalizePortalAddress(config.portalLink || config.portalAddress || address) || address,
    isActivated: Boolean(config.isActivated),
    masterWilayah: Array.isArray(config.masterWilayah) ? config.masterWilayah : [],
    masterGroups: Array.isArray(config.masterGroups) ? config.masterGroups : [],
  };
  try {
    const identity = getCurrentSessionIdentity();
    const scopedKey = getPortalStorageKey(address);
    localStorage.setItem(scopedKey, JSON.stringify(next));
    localStorage.setItem('majo_portal_config', JSON.stringify(next));

    if (identity) {
      localStorage.setItem(`majo_active_portal_address_${identity}`, address);
    } else {
      localStorage.setItem('majo_active_portal_address', address);
    }
  } catch {
    // fallback
  }
}

export function getWorkflowJobs(): WorkflowJob[] {
  try {
    const raw = localStorage.getItem('majo_workflow_jobs');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveWorkflowJobs(jobs: WorkflowJob[]) {
  try {
    localStorage.setItem('majo_workflow_jobs', JSON.stringify(jobs));
  } catch {
    // fallback
  }
}

export function validatePortalAddress(input: string): boolean {
  if (!input || !input.trim()) return false;
  const cleaned = normalizePortalAddress(input);
  if (!cleaned) return false;

  const config = getPortalConfig();
  const validLink = normalizePortalAddress(config.portalLink);
  const validAddress = normalizePortalAddress(config.portalAddress);

  const customAddresses = new Set<string>();
  try {
    const stored = localStorage.getItem('majo_accounts');
    if (stored) {
      const accounts: RegisteredAccount[] = JSON.parse(stored);
      accounts
        .filter((a) => a.role === 'admin' && a.portalAddress)
        .forEach((a) => customAddresses.add(normalizePortalAddress(a.portalAddress)));
    }
  } catch {
    // ignore
  }

  return cleaned === validAddress || cleaned === validLink || customAddresses.has(cleaned);
}
