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
  employeeId?: string;
  notes?: string;
  submittedAt: string;
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
  portalId?: string;
  dateType?: 'single' | 'range';
  singleDate?: string;
  areaType?: 'wilayah' | 'grup' | 'all';
  targetArea?: string;
  targetWilayahList?: string[];
  targetGroupIds?: string[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  pmType?: string;
  hasPhoto: boolean;
  conditionText: string;
  hasTimestamp: boolean;
  notesText: string;
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
}

export interface StaffResetRequest {
  id: string;
  name: string;
  username: string;
  role: string;
  location: string;
  timeAgo: string;
  avatar: string;
  selected: boolean;
  isReset: boolean;
}
