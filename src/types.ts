export type AuthView = 'login' | 'register' | 'forgot_password' | 'admin_dashboard' | 'user_dashboard';

export type UserRole = 'admin' | 'user';

export interface RegisteredAccount {
  uid?: string;
  name: string;
  username: string;
  email?: string;
  password?: string;
  role: UserRole;
  portalAddress: string;
  portalId?: string;
  location?: string;
  createdAt: string;
}

export interface ResetTicket {
  ticketId: string;
  username: string;
  portalAddress?: string;
  employeeId?: string;
  notes?: string;
  submittedAt: string;
  status?: 'pending' | 'completed';
}

export interface RegionDetail {
  name: string;
  percent: string;
  color: string;
}

export interface RecentLog {
  name: string;
  avatar: string;
  activity: string;
  time: string;
}

export interface PmModule {
  name: string;
  itemCount: number;
  pmType?: string;
  checklist?: ChecklistItem[];
}

export interface PmItem {
  id: string;
  code: string;
  title: string;
  dates: string;
  startDate: string;
  endDate: string;
  pic: string;
  picRole: string;
  progress: number;
  doneCount: number;
  totalCount: number;
  pendingCount: number;
  subStationCount?: number;
  regions: string;
  regionsDetail: RegionDetail[];
  recentLog: RecentLog;
  modules?: PmModule[];
  fieldProgress?: Record<string, unknown>[];
  createdBy?: string;
  portalId?: string;
  targetUserUids?: string[];
  dateType?: 'single' | 'range';
  singleDate?: string;
  areaType?: 'wilayah' | 'grup' | 'all';
  targetArea?: string;
  targetWilayahList?: string[];
  targetAreaDetails?: Array<{
    location: string;
    subLocations: Array<{
      name: string;
      places: string[];
    }>;
  }>;
  targetGroupIds?: string[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  pmType?: string;
  hasPhoto: boolean;
  hasCondition?: boolean;
  conditionMode?: 'options' | 'logic' | 'both';
  conditionOptions?: string[];
  conditionLogic?: ConditionLogicRange[];
  conditionText: string;
  hasTimestamp: boolean;
  hasNotes?: boolean;
  notesText: string;
}

export interface ConditionLogicRange {
  id: string;
  min: number;
  max: number;
  output: string;
}

export interface BranchTarget {
  id: string;
  regionKey: 'sor1' | 'sor2';
  name: string;
  checked: boolean;
}

export interface RegionConfig {
  id: string;
  name: string;
  locations: string[];
  locationHierarchy?: Record<string, SubLocationConfig[]>;
}

export interface SubLocationConfig {
  id: string;
  name: string;
  places: string[];
}

export interface StaffResetRequest {
  id: string;
  ticketId?: string;
  name: string;
  username: string;
  role: string;
  location: string;
  employeeId?: string;
  notes?: string;
  accountMatched?: boolean;
  status?: 'pending' | 'processing' | 'completed';
  timeAgo: string;
  avatar: string;
  selected: boolean;
  isReset: boolean;
  isLocal?: boolean;
  temporaryPassword?: string;
}
