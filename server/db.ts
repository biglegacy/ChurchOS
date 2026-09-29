import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export interface User {
  id: string;
  username: string; // e.g. "su@admin" or email
  email: string;
  passwordHash: string;
  fullName: string;
  role:
    | 'SUPER_ADMIN'
    | 'CHURCH_OWNER'
    | 'CHURCH_ADMINISTRATOR'
    | 'ADMINISTRATOR'
    | 'SENIOR_PASTOR'
    | 'PASTOR'
    | 'ASSISTANT_PASTOR'
    | 'PASTOR_MINISTER'
    | 'ACCOUNTANT'
    | 'ATTENDANCE_OFFICER'
    | 'MEMBER_MANAGER'
    | 'SMS_MANAGER'
    | 'TREASURER'
    | 'FINANCE_OFFICER'
    | 'SECRETARY'
    | 'EVENT_COORDINATOR'
    | 'DEPARTMENT_LEADER'
    | 'GROUP_LEADER'
    | 'CUSTOM'
    | 'MEMBER'
    | string;
  roles?: string[]; // Multiple assigned roles
  customRoleTitle?: string;
  permissions?: string[];
  churchId?: string; // null for SUPER_ADMIN
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isPrimaryAccount?: boolean;
  isAssignedRole?: boolean;
  accountType?: 'CHURCH_ACCOUNT' | 'ASSIGNED_MEMBER_ROLE';
  assignedMemberId?: string;
  assignedMemberName?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CustomRole {
  id: string;
  churchId: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface PredefinedRoleDefinition {
  name: string;
  key: string;
  label: string;
  description: string;
  category: 'Clergy' | 'Administration' | 'Finance' | 'Ministry' | 'Operations';
  permissions: string[];
}

export const PREDEFINED_ROLES: PredefinedRoleDefinition[] = [
  {
    name: 'Pastor',
    key: 'PASTOR',
    label: 'Pastor',
    description: 'Pastoral counseling, preaching, member care, services attendance, visitors & ministry reports.',
    category: 'Clergy',
    permissions: [
      'dashboard:view',
      'members:view', 'members:create', 'members:edit',
      'attendance:view', 'attendance:create', 'attendance:edit',
      'pastoral:view', 'pastoral:create', 'pastoral:edit',
      'events:view', 'events:create', 'events:edit',
      'announcements:view', 'announcements:create', 'announcements:edit',
      'reports:view',
    ],
  },
  {
    name: 'Administrator',
    key: 'ADMINISTRATOR',
    label: 'Administrator',
    description: 'Full operational authority across all church operational modules, settings and staff management.',
    category: 'Administration',
    permissions: [
      'dashboard:view',
      'members:view', 'members:create', 'members:edit', 'members:delete', 'members:export',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete', 'attendance:export',
      'tithes:view', 'tithes:create', 'tithes:edit', 'tithes:delete', 'tithes:export',
      'offerings:view', 'offerings:create', 'offerings:edit', 'offerings:delete', 'offerings:export',
      'donations:view', 'donations:create', 'donations:edit', 'donations:delete', 'donations:export',
      'special_giving:view', 'special_giving:create', 'special_giving:edit', 'special_giving:delete',
      'building_fund:view', 'building_fund:create', 'building_fund:edit', 'building_fund:delete',
      'missions:view', 'missions:create', 'missions:edit', 'missions:delete',
      'welfare:view', 'welfare:create', 'welfare:edit', 'welfare:delete',
      'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete', 'expenses:approve', 'expenses:export',
      'financial_reports:view', 'financial_reports:export',
      'events:view', 'events:create', 'events:edit', 'events:delete',
      'departments:view', 'departments:create', 'departments:edit', 'departments:delete',
      'staff:view', 'staff:create', 'staff:edit', 'staff:delete',
      'sms:view', 'sms:send', 'sms:export',
      'announcements:view', 'announcements:create', 'announcements:edit', 'announcements:delete',
      'pastoral:view', 'pastoral:create', 'pastoral:edit', 'pastoral:delete',
      'reports:view', 'reports:export',
      'settings:view', 'settings:edit',
      'audit_logs:view', 'audit_logs:export',
    ],
  },
  {
    name: 'Accounts Officer',
    key: 'ACCOUNTS_OFFICER',
    label: 'Accounts Officer',
    description: 'Day-to-day recording and reporting of tithes, offerings, donations, expenses and funds.',
    category: 'Finance',
    permissions: [
      'dashboard:view',
      'tithes:view', 'tithes:create', 'tithes:edit', 'tithes:export',
      'offerings:view', 'offerings:create', 'offerings:edit', 'offerings:export',
      'donations:view', 'donations:create', 'donations:edit', 'donations:export',
      'special_giving:view', 'special_giving:create', 'special_giving:edit',
      'building_fund:view', 'building_fund:create', 'building_fund:edit',
      'missions:view', 'missions:create', 'missions:edit',
      'welfare:view',
      'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:export',
      'financial_reports:view', 'financial_reports:export',
    ],
  },
  {
    name: 'Treasurer',
    key: 'TREASURER',
    label: 'Treasurer',
    description: 'Senior finance custodian responsible for tithes, receipts, expense disbursement approval & statements.',
    category: 'Finance',
    permissions: [
      'dashboard:view',
      'tithes:view', 'tithes:create', 'tithes:edit', 'tithes:export',
      'offerings:view', 'offerings:create', 'offerings:edit', 'offerings:export',
      'donations:view', 'donations:create', 'donations:edit', 'donations:export',
      'special_giving:view', 'special_giving:create', 'special_giving:edit',
      'building_fund:view', 'building_fund:create', 'building_fund:edit',
      'missions:view', 'missions:create', 'missions:edit',
      'welfare:view',
      'expenses:view', 'expenses:approve', 'expenses:export',
      'financial_reports:view', 'financial_reports:export',
    ],
  },
  {
    name: 'Secretary',
    key: 'SECRETARY',
    label: 'Secretary',
    description: 'Church records, congregation registers, attendance, notices, event schedules & SMS correspondence.',
    category: 'Administration',
    permissions: [
      'dashboard:view',
      'members:view', 'members:create', 'members:edit', 'members:export',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:export',
      'events:view', 'events:create', 'events:edit',
      'announcements:view', 'announcements:create', 'announcements:edit',
      'sms:view', 'sms:send',
      'reports:view',
    ],
  },
  {
    name: 'Auditor',
    key: 'AUDITOR',
    label: 'Auditor',
    description: 'Independent inspection of all financial books, vouchers, tithes, expenditures & audit trails (read-only).',
    category: 'Finance',
    permissions: [
      'dashboard:view',
      'tithes:view', 'tithes:export',
      'offerings:view', 'offerings:export',
      'donations:view', 'donations:export',
      'special_giving:view',
      'building_fund:view',
      'missions:view',
      'welfare:view',
      'expenses:view', 'expenses:export',
      'financial_reports:view', 'financial_reports:export',
      'audit_logs:view', 'audit_logs:export',
    ],
  },
  {
    name: 'Welfare Officer',
    key: 'WELFARE_OFFICER',
    label: 'Welfare Officer',
    description: 'Member benevolence, compassion outreach, visitation and welfare assistance coordination.',
    category: 'Ministry',
    permissions: [
      'dashboard:view',
      'welfare:view', 'welfare:create', 'welfare:edit',
      'pastoral:view', 'pastoral:create',
      'members:view',
      'sms:view', 'sms:send',
    ],
  },
  {
    name: 'Usher',
    key: 'USHER',
    label: 'Usher',
    description: 'Sanctuary order, congregation welcoming, service attendance headcount and roster check-in.',
    category: 'Operations',
    permissions: [
      'dashboard:view',
      'attendance:view', 'attendance:create',
      'events:view',
    ],
  },
  {
    name: 'Youth Leader',
    key: 'YOUTH_LEADER',
    label: 'Youth Leader',
    description: 'Youth fellowship leadership, youth attendance registers, youth programs & notices.',
    category: 'Ministry',
    permissions: [
      'dashboard:view',
      'departments:view', 'departments:edit',
      'attendance:view', 'attendance:create',
      'events:view', 'events:create',
      'announcements:view', 'announcements:create',
      'members:view',
    ],
  },
  {
    name: 'Children\'s Ministry',
    key: 'CHILDRENS_MINISTRY',
    label: 'Children\'s Ministry',
    description: 'Sunday school management, child attendance tracking, family contacts & children events.',
    category: 'Ministry',
    permissions: [
      'dashboard:view',
      'attendance:view', 'attendance:create', 'attendance:edit',
      'events:view', 'events:create',
      'members:view',
    ],
  },
  {
    name: 'Evangelism Officer',
    key: 'EVANGELISM_OFFICER',
    label: 'Evangelism Officer',
    description: 'Outreach missions, new converts tracking, first-time visitors follow-up & follow-up SMS.',
    category: 'Ministry',
    permissions: [
      'dashboard:view',
      'visitors:view', 'visitors:create', 'visitors:edit',
      'events:view', 'events:create',
      'announcements:view', 'announcements:create',
      'sms:view', 'sms:send',
    ],
  },
  {
    name: 'Choir/Music Leader',
    key: 'CHOIR_MUSIC_LEADER',
    label: 'Choir/Music Leader',
    description: 'Music ministry oversight, choir rehearsals attendance, worship schedules & event order.',
    category: 'Ministry',
    permissions: [
      'dashboard:view',
      'departments:view', 'departments:edit',
      'attendance:view', 'attendance:create',
      'events:view',
    ],
  },
  {
    name: 'Department Leader',
    key: 'DEPARTMENT_LEADER',
    label: 'Department Leader',
    description: 'Departmental rosters, group meetings, cell attendance & departmental activities.',
    category: 'Ministry',
    permissions: [
      'dashboard:view',
      'departments:view', 'departments:edit',
      'attendance:view', 'attendance:create',
      'events:view', 'events:create',
    ],
  },
  {
    name: 'Communication Officer',
    key: 'COMMUNICATION_OFFICER',
    label: 'Communication Officer',
    description: 'SMS notifications, broadcast campaigns, church bulletin announcements & delivery monitoring.',
    category: 'Operations',
    permissions: [
      'dashboard:view',
      'sms:view', 'sms:send', 'sms:export',
      'announcements:view', 'announcements:create', 'announcements:edit', 'announcements:delete',
      'events:view',
    ],
  },
  {
    name: 'Viewer/Read Only',
    key: 'VIEWER_READ_ONLY',
    label: 'Viewer/Read Only',
    description: 'Read-only visibility for ministry observers, council guests or read-only committee members.',
    category: 'Operations',
    permissions: [
      'dashboard:view',
      'members:view',
      'events:view',
      'reports:view',
    ],
  },
];

export function normalizeRoleKey(roleStr: string): string {
  if (!roleStr) return '';
  return roleStr.toLowerCase().replace(/[\s\/\_\-]+/g, '');
}

export function getChurchPredefinedRoles(churchId?: string): PredefinedRoleDefinition[] {
  if (!churchId) return PREDEFINED_ROLES;
  const church = db.get('churches').find(c => c.id === churchId);
  if (church?.settings?.predefinedRoles && Array.isArray(church.settings.predefinedRoles)) {
    return church.settings.predefinedRoles;
  }
  return PREDEFINED_ROLES;
}

export function getPredefinedRolePermissions(roleName: string, churchId?: string): string[] {
  if (!roleName) return [];
  const normalized = normalizeRoleKey(roleName);
  const activeRoles = getChurchPredefinedRoles(churchId);
  
  // Direct match against active predefined roles
  for (const r of activeRoles) {
    if (
      normalizeRoleKey(r.name) === normalized ||
      normalizeRoleKey(r.key) === normalized ||
      normalizeRoleKey(r.label) === normalized
    ) {
      return r.permissions;
    }
  }

  // If church customized their predefined roles list and deleted this role, do not alias or fallback!
  const church = churchId ? db.get('churches').find(c => c.id === churchId) : null;
  if (church?.settings?.predefinedRoles && Array.isArray(church.settings.predefinedRoles)) {
    return []; // Role was explicitly deleted by the church
  }

  // Alias legacy role names
  if (normalized === 'accountant' || normalized === 'financeofficer') {
    return activeRoles.find(r => r.key === 'ACCOUNTS_OFFICER')?.permissions || [];
  }
  if (normalized === 'smsmanager') {
    return activeRoles.find(r => r.key === 'COMMUNICATION_OFFICER')?.permissions || [];
  }
  if (normalized === 'attendanceofficer') {
    return activeRoles.find(r => r.key === 'USHER')?.permissions || [];
  }
  if (normalized === 'membermanager') {
    return activeRoles.find(r => r.key === 'SECRETARY')?.permissions || [];
  }
  if (normalized === 'groupleader') {
    return activeRoles.find(r => r.key === 'DEPARTMENT_LEADER')?.permissions || [];
  }
  if (normalized === 'seniorpastor' || normalized === 'assistantpastor' || normalized === 'pastorminister') {
    return activeRoles.find(r => r.key === 'PASTOR')?.permissions || [];
  }
  if (normalized === 'eventcoordinator') {
    return ['dashboard:view', 'events:view', 'events:create', 'events:edit'];
  }
  if (normalized === 'viewer' || normalized === 'readonly') {
    return activeRoles.find(r => r.key === 'VIEWER_READ_ONLY')?.permissions || [];
  }

  // Fallback to legacy dictionary if found
  if (DEFAULT_ROLE_PERMISSIONS[roleName]) {
    return DEFAULT_ROLE_PERMISSIONS[roleName];
  }

  return [];
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  CHURCH_OWNER: ['*'],
  CHURCH_ADMINISTRATOR: ['*'],
  ADMINISTRATOR: PREDEFINED_ROLES.find(r => r.key === 'ADMINISTRATOR')!.permissions,
  PASTOR: PREDEFINED_ROLES.find(r => r.key === 'PASTOR')!.permissions,
  'Pastor': PREDEFINED_ROLES.find(r => r.key === 'PASTOR')!.permissions,
  ACCOUNTS_OFFICER: PREDEFINED_ROLES.find(r => r.key === 'ACCOUNTS_OFFICER')!.permissions,
  'Accounts Officer': PREDEFINED_ROLES.find(r => r.key === 'ACCOUNTS_OFFICER')!.permissions,
  ACCOUNTANT: PREDEFINED_ROLES.find(r => r.key === 'ACCOUNTS_OFFICER')!.permissions,
  TREASURER: PREDEFINED_ROLES.find(r => r.key === 'TREASURER')!.permissions,
  'Treasurer': PREDEFINED_ROLES.find(r => r.key === 'TREASURER')!.permissions,
  SECRETARY: PREDEFINED_ROLES.find(r => r.key === 'SECRETARY')!.permissions,
  'Secretary': PREDEFINED_ROLES.find(r => r.key === 'SECRETARY')!.permissions,
  AUDITOR: PREDEFINED_ROLES.find(r => r.key === 'AUDITOR')!.permissions,
  'Auditor': PREDEFINED_ROLES.find(r => r.key === 'AUDITOR')!.permissions,
  WELFARE_OFFICER: PREDEFINED_ROLES.find(r => r.key === 'WELFARE_OFFICER')!.permissions,
  'Welfare Officer': PREDEFINED_ROLES.find(r => r.key === 'WELFARE_OFFICER')!.permissions,
  USHER: PREDEFINED_ROLES.find(r => r.key === 'USHER')!.permissions,
  'Usher': PREDEFINED_ROLES.find(r => r.key === 'USHER')!.permissions,
  YOUTH_LEADER: PREDEFINED_ROLES.find(r => r.key === 'YOUTH_LEADER')!.permissions,
  'Youth Leader': PREDEFINED_ROLES.find(r => r.key === 'YOUTH_LEADER')!.permissions,
  CHILDRENS_MINISTRY: PREDEFINED_ROLES.find(r => r.key === 'CHILDRENS_MINISTRY')!.permissions,
  "Children's Ministry": PREDEFINED_ROLES.find(r => r.key === 'CHILDRENS_MINISTRY')!.permissions,
  EVANGELISM_OFFICER: PREDEFINED_ROLES.find(r => r.key === 'EVANGELISM_OFFICER')!.permissions,
  'Evangelism Officer': PREDEFINED_ROLES.find(r => r.key === 'EVANGELISM_OFFICER')!.permissions,
  CHOIR_MUSIC_LEADER: PREDEFINED_ROLES.find(r => r.key === 'CHOIR_MUSIC_LEADER')!.permissions,
  'Choir/Music Leader': PREDEFINED_ROLES.find(r => r.key === 'CHOIR_MUSIC_LEADER')!.permissions,
  DEPARTMENT_LEADER: PREDEFINED_ROLES.find(r => r.key === 'DEPARTMENT_LEADER')!.permissions,
  'Department Leader': PREDEFINED_ROLES.find(r => r.key === 'DEPARTMENT_LEADER')!.permissions,
  COMMUNICATION_OFFICER: PREDEFINED_ROLES.find(r => r.key === 'COMMUNICATION_OFFICER')!.permissions,
  'Communication Officer': PREDEFINED_ROLES.find(r => r.key === 'COMMUNICATION_OFFICER')!.permissions,
  VIEWER_READ_ONLY: PREDEFINED_ROLES.find(r => r.key === 'VIEWER_READ_ONLY')!.permissions,
  'Viewer/Read Only': PREDEFINED_ROLES.find(r => r.key === 'VIEWER_READ_ONLY')!.permissions,
  MEMBER: ['portal'],
  CUSTOM: [],
};

export function getDefaultRolePermissions(role: string, churchId?: string): string[] {
  const perms = getPredefinedRolePermissions(role, churchId);
  if (perms && perms.length > 0) return perms;
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

export interface Church {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  seniorPastor: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  logo?: string;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  smsCredits?: number;
  smsAllocatedUnits?: number;
  smsUnitsUsed?: number;
  smsPricePerUnit?: number;
  smsStatus?: 'ACTIVE' | 'DISABLED';
  subscription: {
    plan: string;
    status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
    expiresAt: string;
    priceGHS: number;
  };
  features: {
    sms: boolean;
    finance: boolean;
    events: boolean;
    groups: boolean;
    pastoral: boolean;
    discipleship: boolean;
    assets: boolean;
    children: boolean;
  };
  settings: {
    senderName: string;
    currency: string;
    smsEnabled?: boolean;
    smsGateway?: 'Arkesel' | 'Hubtel' | 'mNotify' | 'Twilio';
    smsApiKey?: string;
    smsSenderId?: string;
    allowManualSms?: boolean;
    autoContributionSmsEnabled?: boolean;
    autoContributionSmsTypes?: string[];
    customGivingTypes?: string[];
    customExpenseCategories?: string[];
    customDepartmentCategories?: string[];
    customPastoralCategories?: string[];
    predefinedRoles?: PredefinedRoleDefinition[];
    contributionSmsTemplate?: string;
    absenceSmsEnabled: boolean;
    absenceSmsDelayMinutes: number;
    absenceSmsTemplate: string;
    absenceTriggerServices: string[];
    titheConfirmationSmsEnabled?: boolean;
    titheConfirmationTemplate?: string;
    titheReminderEnabled: boolean;
    titheReminderTemplate: string;
    titheReminderFrequency: 'weekly' | 'monthly' | 'campaign';
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Member {
  id: string;
  churchId: string;
  memberCode: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  address: string;
  occupation: string;
  maritalStatus: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  membershipStatus: 'Active' | 'Inactive' | 'Under Discipline' | 'Transferred';
  joinDate: string;
  baptismStatus: 'Baptized' | 'Not Baptized' | 'Scheduled';
  familyId?: string;
  familyRole?: 'Head' | 'Spouse' | 'Child' | 'Member';
  departmentIds: string[];
  ministryIds: string[];
  groupIds: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Family {
  id: string;
  churchId: string;
  familyName: string;
  headMemberId?: string;
  headMemberName: string;
  spouseMemberId?: string;
  spouseMemberName?: string;
  phone: string;
  address: string;
  members: string[]; // member IDs
  createdAt: string;
}

export interface Visitor {
  id: string;
  churchId: string;
  fullName: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  visitDate: string;
  serviceAttended: string;
  invitedBy: string;
  followUpStatus: 'New' | 'Contacted' | 'Visited' | 'Joined' | 'Dropped';
  assignedPastorLeader: string;
  notes: string;
  followUpHistory: Array<{ date: string; by: string; note: string; outcome: string }>;
  convertedToMemberId?: string;
  createdAt: string;
}

export interface NewConvert {
  id: string;
  churchId: string;
  fullName: string;
  phone: string;
  normalizedPhone: string;
  dateOfDecision: string;
  serviceName: string;
  assignedLeader: string;
  followUpStatus: 'New' | 'First Call' | 'Home Visit' | 'Foundation Class';
  discipleshipStatus: 'Stage 1: Salvation' | 'Stage 2: Water Baptism' | 'Stage 3: Holy Spirit' | 'Stage 4: Completed';
  notes: string;
  followUpHistory: Array<{ date: string; by: string; note: string }>;
  createdAt: string;
}

export interface ChurchService {
  id: string;
  churchId: string;
  serviceName: string;
  serviceType?: string;
  date: string;
  startTime: string;
  endTime: string;
  preacher: string;
  sermonTitle?: string;
  themeScripture?: string;
  worshipLeader?: string;
  choir?: string;
  ushers?: string;
  mediaTeam?: string;
  notes?: string;
  attendanceFinalized: boolean;
  attendanceFinalizedAt?: string;
  attendanceFinalizedBy?: string;
  absenceSmsSentCount?: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  churchId: string;
  serviceId: string;
  serviceName?: string;
  serviceDate?: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  status: 'Present' | 'Absent' | 'Excused';
  checkInTime?: string;
  checkInMethod?: string;
  markedBy?: string;
  method?: 'Manual Check-in' | 'Self Check-in' | 'Roster Finalization' | string;
  notes?: string;
  date?: string;
  createdAt?: string;
}

export type GivingCategory =
  | 'Tithes'
  | 'Offerings'
  | 'Donations'
  | 'Special Giving'
  | 'Building Fund'
  | 'Missions'
  | 'Welfare'
  | 'Other Giving';

export const GIVING_CATEGORIES: GivingCategory[] = [
  'Tithes',
  'Offerings',
  'Donations',
  'Special Giving',
  'Building Fund',
  'Missions',
  'Welfare',
  'Other Giving',
];

export function resolveReliableGivingCategory(giving: {
  givingCategory?: string;
  category?: string;
  givingType?: string;
}): GivingCategory {
  const existingCat = (giving.givingCategory || giving.category || '').trim();
  if (existingCat) {
    const lower = existingCat.toLowerCase();
    if (lower === 'tithes' || lower === 'tithe') return 'Tithes';
    if (lower === 'offerings' || lower === 'offering') return 'Offerings';
    if (lower === 'donations' || lower === 'donation') return 'Donations';
    if (
      lower === 'special giving' ||
      lower === 'special offering' ||
      lower === 'special contributions' ||
      lower === 'special'
    )
      return 'Special Giving';
    if (lower === 'building fund' || lower === 'building') return 'Building Fund';
    if (lower === 'missions' || lower === 'mission') return 'Missions';
    if (lower === 'welfare' || lower === 'benevolence') return 'Welfare';
    if (lower === 'other giving' || lower === 'other') return 'Other Giving';
  }

  const type = (giving.givingType || '').trim().toLowerCase();
  if (type === 'tithe' || type === 'tithes') return 'Tithes';
  if (type === 'offering' || type === 'offerings') return 'Offerings';
  if (type === 'donation' || type === 'donations') return 'Donations';
  if (
    type === 'special giving' ||
    type === 'special offering' ||
    type === 'special contributions' ||
    type === 'special'
  )
    return 'Special Giving';
  if (type === 'building fund' || type === 'building') return 'Building Fund';
  if (type === 'missions' || type === 'mission') return 'Missions';
  if (type === 'welfare' || type === 'benevolence') return 'Welfare';

  return 'Other Giving';
}

export interface GivingRecord {
  id: string;
  churchId: string;
  receiptNumber: string;
  referenceNumber?: string;
  givingCategory: GivingCategory | string;
  category: GivingCategory | string;
  givingType: string;
  amount: number;
  currency: string;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'POS Card' | 'Cheque' | string;
  mobileMoneyNumber?: string;
  mobileMoneyNetwork?: 'MTN' | 'Telecel' | 'AT' | 'Other';
  memberId?: string;
  memberName: string;
  phone?: string;
  serviceId?: string;
  date: string;
  notes?: string;
  campaignOrProject?: string;
  recordedBy: string;
  smsSent: boolean;
  smsMessageId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseRecord {
  id: string;
  churchId: string;
  category: string;
  customCategory?: string;
  isCustom?: boolean;
  amount: number;
  currency: string;
  date: string;
  payee: string;
  paymentMethod: string;
  receiptUrl?: string;
  approvalStatus: 'Approved' | 'Pending' | 'Rejected';
  description: string;
  recordedBy: string;
  createdAt: string;
}

export interface FinanceAccount {
  id: string;
  churchId: string;
  accountName: string;
  accountType: 'Cash' | 'Bank' | 'Mobile Money';
  balance: number;
  currency: string;
  accountNumber?: string;
  institution?: string;
}

export interface PastoralCase {
  id: string;
  churchId: string;
  caseType: 'Prayer Request' | 'Counselling' | 'Hospital Visit' | 'Home Visit' | 'Welfare Case' | 'Bereavement' | string;
  customCaseType?: string;
  isCustom?: boolean;
  memberNameOrSubject: string;
  phone: string;
  assignedPastor: string;
  priority: 'High' | 'Normal' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  confidentialNotes: string;
  followUpDate?: string;
  history: Array<{ date: string; action: string; notes: string; by: string }>;
  createdAt: string;
}

export interface DepartmentOrGroup {
  id: string;
  churchId: string;
  name: string;
  type: 'department' | 'ministry' | 'cell_group' | string;
  category?: string;
  customCategory?: string;
  isCustom?: boolean;
  leaderName: string;
  leaderPhone: string;
  meetingDay: string;
  meetingTime: string;
  meetingLocation: string;
  memberCount: number;
  description: string;
  createdAt: string;
}

export interface ChurchNotification {
  id: string;
  churchId?: string;
  title: string;
  message: string;
  category: 'FINANCE' | 'SMS' | 'EVENT' | 'MEMBER' | 'PASTORAL' | 'SYSTEM';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: string;
  linkTab?: string;
  metadata?: Record<string, any>;
}

export interface ChurchEvent {
  id: string;
  churchId: string;
  title: string;
  category?: string;
  customCategory?: string;
  isCustom?: boolean;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  guestSpeaker?: string;
  targetAudience?: string;
  expectedAttendance?: number;
  description: string;
  organizer: string;
  reminderScheduled: boolean;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export type SmsDeliveryStatus =
  | 'Submitted'
  | 'Queued'
  | 'Pending'
  | 'Delivered'
  | 'Not Delivered'
  | 'Failed'
  | 'Expired'
  | 'Prohibited'
  | 'Unable to Send'
  | 'Sending'
  | 'Accepted'
  | 'Undelivered'
  | 'Rejected';

export type SmsStatus = SmsDeliveryStatus;

export interface SmsMessage {
  id: string;
  churchId: string;
  churchName?: string;
  memberId?: string;
  recipientName: string;
  phone: string;
  normalizedPhone: string;
  recipientPhone?: string;
  recipientNetwork?: string;
  senderName: string;
  message: string;
  notificationType: 'CONTRIBUTION_CONFIRMATION' | 'ABSENCE_FOLLOWUP' | 'TITHE_CONFIRMATION' | 'TITHE_REMINDER' | 'GIVING_REMINDER' | 'VISITOR_WELCOME' | 'VISITOR_FOLLOWUP' | 'NEW_MEMBER' | 'BROADCAST' | 'EVENT_REMINDER' | 'BULK_ANNOUNCEMENT' | 'BIRTHDAY_GREETING' | 'CUSTOM' | 'TEST';
  relatedContributionId?: string;
  relatedReceiptNumber?: string;
  status: SmsDeliveryStatus;
  unitsDeducted?: number;
  ratePerUnitGHS?: number;
  costGHS?: number;
  providerResponse?: string;
  gatewayResponse?: string;
  providerMessageId?: string;
  arkeselMessageId?: string;
  failureReason?: string;
  idempotencyKey?: string;
  submittedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  sentAt?: string;
  createdAt: string;
}

export interface SmsUnitAudit {
  id: string;
  churchId: string;
  churchName: string;
  action: 'ASSIGN' | 'ADD' | 'DEDUCT' | 'PRICE_CHANGE' | 'STATUS_CHANGE';
  amountChanged?: number;
  prevUnits: number;
  newUnits: number;
  prevPrice?: number;
  newPrice?: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  churchId: string; // 'PLATFORM' or churchId
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface CentralPlatformSettings {
  smsProvider: string;
  apiKey: string;
  defaultSenderId: string;
  apiEndpoint: string;
  connectionStatus: 'Connected' | 'Disconnected' | 'Degraded';
  balanceCredits: number;
  costPerCreditGHS: number;
  totalSmsDispatched: number;
  appName: string;
  supportEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  code: string;
  priceMonthlyGHS: number;
  priceAnnualGHS: number;
  maxMembers: number;
  monthlySmsCredits: number;
  features: string[];
  isPopular?: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface PopupMessage {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ANNOUNCEMENT' | 'MAINTENANCE';
  targetAudience: 'ALL' | 'CHURCH_ADMINS' | 'MEMBERS';
  active: boolean;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'SYSTEM' | 'SMS' | 'SECURITY' | 'BILLING';
  isRead: boolean;
  createdAt: string;
}

export type MinistryTaskCategory =
  | 'Pastoral Follow-up'
  | 'Event Setup'
  | 'Visitation'
  | 'Administration'
  | 'Finance Audit'
  | 'Media & Sound'
  | 'Welfare & Outreach'
  | 'General'
  | string;

export type MinistryTaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type MinistryTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface MinistryTask {
  id: string;
  churchId: string;
  title: string;
  description?: string;
  category: MinistryTaskCategory;
  assignedToName?: string;
  assignedToRole?: string;
  assignedMemberId?: string;
  departmentId?: string;
  departmentName?: string;
  priority: MinistryTaskPriority;
  dueDate: string;
  status: MinistryTaskStatus;
  cancelledReason?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DatabaseSchema {
  users: User[];
  churches: Church[];
  customRoles: CustomRole[];
  members: Member[];
  families: Family[];
  visitors: Visitor[];
  newConverts: NewConvert[];
  services: ChurchService[];
  attendance: AttendanceRecord[];
  giving: GivingRecord[];
  expenses: ExpenseRecord[];
  accounts: FinanceAccount[];
  pastoralCases: PastoralCase[];
  departments: DepartmentOrGroup[];
  events: ChurchEvent[];
  tasks: MinistryTask[];
  smsMessages: SmsMessage[];
  auditLogs: AuditLog[];
  platformSettings: CentralPlatformSettings;
  pricingPlans: PricingPlan[];
  popupMessages: PopupMessage[];
  systemNotifications: SystemNotification[];
  smsUnitAudits: SmsUnitAudit[];
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_church_os_salt_2026').digest('hex');
}

export function getInitialDb(): DatabaseSchema {
  const superAdminPasswordHash = hashPassword('suadmin123');
  const now = new Date().toISOString();

  const superAdminUser: User = {
    id: 'usr_super_admin_001',
    username: 'su@admin',
    email: 'admin@church-os.com',
    passwordHash: superAdminPasswordHash,
    fullName: 'Super Administrator',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: now,
  };

  const seedPlatformSettings: CentralPlatformSettings = {
    smsProvider: 'Arkesel',
    apiKey: process.env.ARKESEL_API_KEY || '',
    defaultSenderId: 'CHURCH-OS',
    apiEndpoint: 'https://sms.arkesel.com/api/v2/sms/send',
    connectionStatus: 'Connected',
    balanceCredits: 500,
    costPerCreditGHS: 0.045,
    totalSmsDispatched: 0,
    appName: 'Church-OS',
    supportEmail: 'support@church-os.com',
    supportPhone: '+233240000000',
    maintenanceMode: false,
  };

  const seedAuditLogs: AuditLog[] = [
    {
      id: 'aud_001',
      churchId: 'PLATFORM',
      userId: 'system',
      userName: 'Church-OS System Core',
      action: 'SYSTEM_BOOTSTRAP',
      details: 'Church-OS multi-tenant instance initialized with Firebase as exclusive database.',
      timestamp: now,
    },
  ];

  const seedPricingPlans: PricingPlan[] = [
    {
      id: 'plan_starter',
      name: 'Starter Church',
      code: 'starter',
      priceMonthlyGHS: 120,
      priceAnnualGHS: 1200,
      maxMembers: 150,
      monthlySmsCredits: 300,
      features: ['Attendance Tracking', 'SMS Broadcasts', 'Member Directory', 'Giving Records'],
      status: 'ACTIVE',
    },
    {
      id: 'plan_growth',
      name: 'Growth Sanctuary',
      code: 'growth',
      priceMonthlyGHS: 250,
      priceAnnualGHS: 2500,
      maxMembers: 600,
      monthlySmsCredits: 1000,
      features: ['Automated Absence Follow-ups', 'Finance Accounting', 'Departments & Cells', 'Visitor Conversion'],
      isPopular: true,
      status: 'ACTIVE',
    },
    {
      id: 'plan_kingdom',
      name: 'Kingdom Cathedral',
      code: 'kingdom',
      priceMonthlyGHS: 480,
      priceAnnualGHS: 4800,
      maxMembers: 2500,
      monthlySmsCredits: 3000,
      features: ['Multi-Branch Support', 'Pastoral Case Management', 'Custom Sender ID', 'Priority Gateway'],
      status: 'ACTIVE',
    },
    {
      id: 'plan_enterprise',
      name: 'Global Megachurch',
      code: 'enterprise',
      priceMonthlyGHS: 850,
      priceAnnualGHS: 8500,
      maxMembers: 10000,
      monthlySmsCredits: 10000,
      features: ['Dedicated SLA', 'Custom API Integrations', 'Unlimited Branches', 'Dedicated Account Manager'],
      status: 'ACTIVE',
    },
  ];

  return {
    users: [superAdminUser],
    churches: [],
    customRoles: [],
    members: [],
    families: [],
    visitors: [],
    newConverts: [],
    services: [],
    attendance: [],
    giving: [],
    expenses: [],
    accounts: [],
    pastoralCases: [],
    departments: [],
    events: [],
    tasks: [],
    smsMessages: [],
    auditLogs: [],
    platformSettings: seedPlatformSettings,
    pricingPlans: [],
    popupMessages: [],
    systemNotifications: [],
    smsUnitAudits: [],
  };
}

const COLLECTION_KEYS: Array<keyof Omit<DatabaseSchema, 'platformSettings'>> = [
  'users',
  'churches',
  'customRoles',
  'members',
  'families',
  'visitors',
  'newConverts',
  'services',
  'attendance',
  'giving',
  'expenses',
  'accounts',
  'pastoralCases',
  'departments',
  'events',
  'tasks',
  'smsMessages',
  'auditLogs',
  'pricingPlans',
  'popupMessages',
  'systemNotifications',
  'smsUnitAudits',
];

function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const [key, val] of Object.entries(obj as any)) {
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

class FirebaseDatabase {
  public firestore: Firestore;
  private data: DatabaseSchema;
  public ready: Promise<void>;
  private isInitialized = false;

  constructor() {
    // Initialize Firebase SDK with application config and secure env vars
    const activeConfig = {
      ...firebaseConfig,
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '',
      projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || 'ai-studio-churchos-2b0b1613-9c00-4997-af8c-65b3b5a93def',
    };
    const app = initializeApp(activeConfig);
    this.firestore = getFirestore(app, activeConfig.firestoreDatabaseId);

    // Initial in-memory template while Firestore connects
    this.data = getInitialDb();

    // Connect to Firestore and establish real-time listeners
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    try {
      console.log('[FirebaseDb] Connecting to exclusive Firestore database:', firebaseConfig.firestoreDatabaseId);

      // 1. Load platformSettings doc
      const settingsRef = doc(this.firestore, 'platformSettings', 'central');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        this.data.platformSettings = settingsSnap.data() as CentralPlatformSettings;
      } else {
        // Seed initial platform settings to Firestore
        await setDoc(settingsRef, sanitizeForFirestore(this.data.platformSettings));
      }

      // 2. Setup real-time listener for platformSettings
      onSnapshot(
        settingsRef,
        (snap) => {
          if (snap.exists()) {
            this.data.platformSettings = snap.data() as CentralPlatformSettings;
          }
        },
        (error) => {
          console.warn('[FirebaseDb] onSnapshot error on platformSettings:', error.message);
        }
      );

      // 3. Load all collections from Firestore
      const loadPromises = COLLECTION_KEYS.map(async (key) => {
        try {
          const colRef = collection(this.firestore, key);
          const snap = await getDocs(colRef);
          const docs: any[] = [];
          snap.forEach((d) => {
            docs.push({ id: d.id, ...d.data() });
          });
          (this.data[key] as any) = docs;

          // Setup real-time listener for this collection
          onSnapshot(
            colRef,
            (snapshot) => {
              const liveDocs: any[] = [];
              snapshot.forEach((d) => {
                liveDocs.push({ id: d.id, ...d.data() });
              });
              (this.data[key] as any) = liveDocs;
            },
            (error) => {
              console.warn(`[FirebaseDb] onSnapshot error on collection "${key}":`, error.message);
            }
          );
        } catch (colErr: any) {
          console.warn(`[FirebaseDb] Failed loading initial collection "${key}":`, colErr.message);
        }
      });

      await Promise.all(loadPromises);

      // Ensure all churches have valid smsCredits, allocated units, price, and status
      for (const c of this.data.churches) {
        let changed = false;
        if (c.smsCredits === undefined || c.smsCredits === null) {
          c.smsCredits = 500;
          changed = true;
        }
        if (c.smsAllocatedUnits === undefined || c.smsAllocatedUnits === null) {
          c.smsAllocatedUnits = c.smsCredits || 500;
          changed = true;
        }
        if (c.smsUnitsUsed === undefined || c.smsUnitsUsed === null) {
          c.smsUnitsUsed = 0;
          changed = true;
        }
        if (c.smsPricePerUnit === undefined || c.smsPricePerUnit === null) {
          c.smsPricePerUnit = 0.05;
          changed = true;
        }
        if (!c.smsStatus) {
          c.smsStatus = 'ACTIVE';
          changed = true;
        }
        if (changed) {
          await this.saveDoc('churches', c.id, c).catch(console.error);
        }
      }

      // 4. Verify Super Admin exists in Firestore users collection
      const superAdminUser = this.data.users.find((u) => u.role === 'SUPER_ADMIN');
      if (!superAdminUser) {
        console.log('[FirebaseDb] Seeding Super Admin into Firestore users collection...');
        const initial = getInitialDb();
        const su = initial.users[0];
        await setDoc(doc(this.firestore, 'users', su.id), sanitizeForFirestore(su));
        this.data.users = [su, ...this.data.users];
      }

      // 5. Database Migration: Ensure all giving records have strictly defined givingCategory and category
      for (const g of this.data.giving) {
        let changed = false;
        if (!g.givingCategory || !g.category) {
          const resolved = resolveReliableGivingCategory(g);
          g.givingCategory = resolved;
          g.category = resolved;
          changed = true;
        }
        if (changed) {
          await this.saveDoc('giving', g.id, g).catch(console.error);
        }
      }

      this.isInitialized = true;
      console.log('[FirebaseDb] Connected to Firebase Firestore. Total churches:', this.data.churches.length);
    } catch (err) {
      console.error('[FirebaseDb] Initialization error connecting to Firestore:', err);
    }
  }

  // Get current live state from Firestore
  public get<K extends keyof DatabaseSchema>(table: K): DatabaseSchema[K] {
    return this.data[table];
  }

  // Direct asynchronous write of a document to Firestore
  public async saveDoc(collectionName: string, docId: string, data: any): Promise<void> {
    try {
      const cleanData = sanitizeForFirestore({ ...data });
      delete (cleanData as any).id; // Avoid duplicate id inside data body
      const docRef = doc(this.firestore, collectionName, docId);
      await setDoc(docRef, cleanData, { merge: true });
    } catch (err: any) {
      console.error(`[FirebaseDb] Failed to saveDoc ${collectionName}/${docId} to Firestore:`, err?.message || err);
    }
    // Optimistically update memory
    if (collectionName === 'platformSettings') {
      this.data.platformSettings = { ...this.data.platformSettings, ...data };
    } else if (COLLECTION_KEYS.includes(collectionName as any)) {
      const arr = (this.data as any)[collectionName] as any[];
      const idx = arr.findIndex((item) => item.id === docId);
      const fullDoc = { id: docId, ...data };
      if (idx >= 0) {
        arr[idx] = fullDoc;
      } else {
        arr.push(fullDoc);
      }
    }
  }

  // Direct asynchronous deletion of a document from Firestore
  public async deleteDoc(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.error(`[FirebaseDb] Failed to deleteDoc ${collectionName}/${docId} from Firestore:`, err?.message || err);
    }
    // Optimistically remove from memory
    if (COLLECTION_KEYS.includes(collectionName as any)) {
      const arr = (this.data as any)[collectionName] as any[];
      (this.data as any)[collectionName] = arr.filter((item) => item.id !== docId);
    }
  }

  // Direct asynchronous fetch of a document from Firestore
  public async getDoc(collectionName: string, docId: string): Promise<any> {
    const docRef = doc(this.firestore, collectionName, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  // Permanently delete a church and cascade delete all tenant-scoped data in Firestore
  public async permanentlyDeleteChurch(churchId: string): Promise<void> {
    console.log(`[FirebaseDb] Permanently deleting church ${churchId} and all associated records from Firestore...`);
    
    // 1. Delete church document in Firestore
    await deleteDoc(doc(this.firestore, 'churches', churchId));
    this.data.churches = this.data.churches.filter((c) => c.id !== churchId);

    // 2. Cascade delete tenant records from all scoped collections
    const tenantCollections: Array<keyof DatabaseSchema> = [
      'users',
      'customRoles',
      'members',
      'families',
      'visitors',
      'newConverts',
      'services',
      'attendance',
      'giving',
      'expenses',
      'accounts',
      'pastoralCases',
      'departments',
      'events',
      'tasks',
      'smsMessages',
    ];

    for (const colKey of tenantCollections) {
      const list = (this.data[colKey] as any[]) || [];
      const toDelete = list.filter((item) => item.churchId === churchId);
      for (const item of toDelete) {
        try {
          await deleteDoc(doc(this.firestore, colKey, item.id));
        } catch (e) {
          console.warn(`[FirebaseDb] Error deleting ${colKey}/${item.id}:`, e);
        }
      }
      (this.data as any)[colKey] = list.filter((item) => item.churchId !== churchId);
    }

    console.log(`[FirebaseDb] Church ${churchId} permanently deleted from Firestore.`);
  }

  // Synchronous/Async hybrid mutator for existing routes
  public update<K extends keyof DatabaseSchema>(
    table: K,
    mutator: (current: DatabaseSchema[K]) => DatabaseSchema[K]
  ): DatabaseSchema[K] {
    const previous = this.data[table];
    const updated = mutator(previous);
    this.data[table] = updated;

    // Asynchronously persist changes directly to Firestore
    if (table === 'platformSettings') {
      const settingsRef = doc(this.firestore, 'platformSettings', 'central');
      const cleanSettings = sanitizeForFirestore(updated as CentralPlatformSettings);
      setDoc(settingsRef, cleanSettings, { merge: true }).catch((err) => {
        console.error('[FirebaseDb] Failed to persist platformSettings to Firestore:', err);
      });
    } else if (Array.isArray(updated) && Array.isArray(previous)) {
      const updatedList = updated as any[];
      const previousList = previous as any[];
      const prevIds = new Set(previousList.map((x) => x.id));
      const newIds = new Set(updatedList.map((x) => x.id));

      // Persist created or updated documents to Firestore
      for (const item of updatedList) {
        if (!item.id) continue;
        const prevItem = previousList.find((x) => x.id === item.id);
        if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
          const cleanItem = sanitizeForFirestore({ ...item });
          delete (cleanItem as any).id;
          setDoc(doc(this.firestore, table as string, item.id), cleanItem, { merge: true }).catch((err) => {
            console.error(`[FirebaseDb] Failed to save doc ${table}/${item.id} to Firestore:`, err);
          });
        }
      }

      // Delete removed documents from Firestore
      for (const prevItem of previousList) {
        if (prevItem.id && !newIds.has(prevItem.id)) {
          deleteDoc(doc(this.firestore, table as string, prevItem.id)).catch((err) => {
            console.error(`[FirebaseDb] Failed to delete doc ${table}/${prevItem.id} from Firestore:`, err);
          });
        }
      }
    }

    return this.data[table];
  }

  public getRaw(): DatabaseSchema {
    return this.data;
  }
}

export const db = new FirebaseDatabase();
