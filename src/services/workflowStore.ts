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

const DEFAULT_PORTAL_ADDRESS = 'pt-majo-logistik-indo';
const DEFAULT_PORTAL_LINK = 'portal.majo.id/org/pt-majo-logistik-indo';

export const INITIAL_MASTER_WILAYAH: string[] = [
  'Medan - Hub Operasional',
  'Jakarta Pusat (HQ)',
  'Bandung - Hub Logistik',
  'Surabaya - Hub Timur',
  'Batam - Pusat Distribusi',
  'Pekanbaru - Depo',
  'Semarang - Depo Transit',
  'Denpasar - Hub Bali & Nusa',
  'Makassar - Gateway Sulawesi',
  'Balikpapan - Hub Kalimantan',
];

export const INITIAL_MASTER_GROUPS: RegionConfig[] = [
  {
    id: 'sor1',
    name: 'SOR 1 (Sumatera Bagian Utara)',
    locations: ['Medan - Hub Operasional', 'Batam - Pusat Distribusi', 'Pekanbaru - Depo'],
  },
  {
    id: 'sor2',
    name: 'SOR 2 (Jawa Barat & DKI Jakarta)',
    locations: ['Jakarta Pusat (HQ)', 'Bandung - Hub Logistik'],
  },
];

export const INITIAL_WORKFLOW_JOBS: WorkflowJob[] = [
  {
    id: 'pm-2026-sep-001',
    code: 'PM-2026-SEP-001',
    title: 'PM September 2026 – Inspeksi & Pemeliharaan Rutin Gardu & Hub Operasional Medan',
    dateType: 'range',
    startDate: '2026-09-01',
    endDate: '2026-09-28',
    dates: '01 Sep 2026 – 28 Sep 2026',
    areaType: 'wilayah',
    targetArea: 'Medan - Hub Operasional',
    targetWilayahList: ['Medan - Hub Operasional'],
    pic: 'Agus Setiawan, S.T.',
    picRole: 'Lead Teknisi Lapangan',
    isSubmitted: false,
    progress: 65,
    subJobs: [
      { id: 1, title: 'Daftar Jobs 1: Cek Catu Daya Gardu & Trafo', pmType: 'ups' },
      { id: 2, title: 'Daftar Jobs 2: Inspeksi Suhu & Rak Server', pmType: 'suhu_ruangan' },
      { id: 3, title: 'Daftar Jobs 3: PAC & Pendingin Ruang Gedung', pmType: 'pac_ac' },
      { id: 4, title: 'Daftar Jobs 4: Proteksi Kebakaran (APAR)', pmType: 'fire_extinguisher' },
    ],
  },
];

// Helper methods with localStorage fallback
export function getPortalConfig(): PortalMasterConfig {
  try {
    const raw = localStorage.getItem('majo_portal_config');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    portalAddress: DEFAULT_PORTAL_ADDRESS,
    portalLink: DEFAULT_PORTAL_LINK,
    isActivated: true,
    masterWilayah: INITIAL_MASTER_WILAYAH,
    masterGroups: INITIAL_MASTER_GROUPS,
  };
}

export function savePortalConfig(config: PortalMasterConfig) {
  try {
    localStorage.setItem('majo_portal_config', JSON.stringify(config));
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
  return INITIAL_WORKFLOW_JOBS;
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
  const cleaned = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const config = getPortalConfig();
  const validLink = config.portalLink.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const validAddress = config.portalAddress.toLowerCase();

  // Also check stored accounts
  let customAddresses: string[] = [];
  try {
    const stored = localStorage.getItem('majo_accounts');
    if (stored) {
      const accounts: RegisteredAccount[] = JSON.parse(stored);
      customAddresses = accounts.filter((a) => a.role === 'admin').map((a) => a.portalAddress.toLowerCase());
    }
  } catch {
    // ignore
  }

  return (
    cleaned === validAddress ||
    cleaned === validLink ||
    cleaned.includes(validAddress) ||
    validLink.includes(cleaned) ||
    customAddresses.some((addr) => cleaned === addr || cleaned.includes(addr) || addr.includes(cleaned)) ||
    cleaned.includes('majo')
  );
}
