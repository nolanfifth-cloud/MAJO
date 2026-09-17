export type AuthView = 'login' | 'register' | 'forgot_password' | 'admin_dashboard' | 'user_dashboard';

export type UserRole = 'admin' | 'user';

export interface RegisteredAccount {
  name: string;
  username: string;
  role: UserRole;
  portalAddress: string;
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
}

export interface ChecklistItem {
  id: string;
  text: string;
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
