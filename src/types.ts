export interface User {
  id: string;
  username: string;
  email: string;
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
    | 'TREASURER'
    | 'FINANCE_OFFICER'
    | 'SECRETARY'
    | 'DEPARTMENT_LEADER'
    | 'GROUP_LEADER'
    | 'CUSTOM'
    | 'MEMBER'
    | string;
  customRoleTitle?: string;
  permissions?: string[];
  churchId?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt?: string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  CHURCH_OWNER: ['dashboard', 'members', 'attendance', 'sms', 'giving', 'expenses', 'visitors', 'pastoral', 'departments', 'events', 'staff', 'settings'],
  CHURCH_ADMINISTRATOR: ['dashboard', 'members', 'attendance', 'sms', 'giving', 'expenses', 'visitors', 'pastoral', 'departments', 'events', 'staff', 'settings'],
  ADMINISTRATOR: ['dashboard', 'members', 'attendance', 'sms', 'giving', 'expenses', 'visitors', 'pastoral', 'departments', 'events', 'staff', 'settings'],
  ACCOUNTANT: ['dashboard', 'giving', 'expenses'],
  TREASURER: ['dashboard', 'giving', 'expenses'],
  FINANCE_OFFICER: ['dashboard', 'giving', 'expenses'],
  PASTOR: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events', 'departments', 'sms'],
  SENIOR_PASTOR: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events', 'departments', 'sms'],
  ASSISTANT_PASTOR: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events', 'departments', 'sms'],
  PASTOR_MINISTER: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events', 'departments', 'sms'],
  SECRETARY: ['dashboard', 'members', 'attendance', 'visitors', 'events', 'sms', 'departments'],
  DEPARTMENT_LEADER: ['dashboard', 'members', 'attendance', 'departments', 'events'],
  GROUP_LEADER: ['dashboard', 'members', 'attendance', 'departments', 'events'],
  MEMBER: ['portal'],
  CUSTOM: ['dashboard'],
};

export function getDefaultRolePermissions(role: string): string[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || ['dashboard'];
}

export type ChurchPermission =
  | 'view_dashboard'
  | 'manage_members'
  | 'manage_attendance'
  | 'send_sms'
  | 'manage_giving'
  | 'manage_visitors'
  | 'manage_pastoral'
  | 'manage_departments'
  | 'manage_events'
  | 'manage_staff'
  | 'manage_settings'
  | 'view_reports';

export type ChurchStaffRole =
  | 'ACCOUNTANT'
  | 'PASTOR'
  | 'ASSISTANT_PASTOR'
  | 'TREASURER'
  | 'SECRETARY'
  | 'FINANCE_OFFICER'
  | 'ADMINISTRATOR'
  | 'CUSTOM';

export const ALL_CHURCH_PERMISSIONS: ChurchPermission[] = [
  'view_dashboard',
  'manage_members',
  'manage_attendance',
  'send_sms',
  'manage_giving',
  'manage_visitors',
  'manage_pastoral',
  'manage_departments',
  'manage_events',
  'manage_staff',
  'manage_settings',
  'view_reports',
];

export function hasPermission(
  user: { role: string; permissions?: string[] } | null | undefined,
  permission: string
): boolean {
  if (!user) return false;
  if (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'CHURCH_OWNER' ||
    user.role === 'CHURCH_ADMINISTRATOR' ||
    user.role === 'ADMINISTRATOR'
  ) return true;

  const userPerms = (user.permissions && user.permissions.length > 0)
    ? user.permissions
    : getDefaultRolePermissions(user.role);

  if (userPerms.includes('*') || userPerms.includes(permission)) return true;

  // Also handle alias mapping between short keys ('giving') and full keys ('manage_giving')
  const aliasMap: Record<string, string[]> = {
    view_dashboard: ['dashboard'],
    dashboard: ['view_dashboard'],
    manage_members: ['members'],
    members: ['manage_members'],
    manage_attendance: ['attendance'],
    attendance: ['manage_attendance'],
    send_sms: ['sms'],
    sms: ['send_sms'],
    manage_giving: ['giving', 'finances'],
    giving: ['manage_giving'],
    manage_visitors: ['visitors'],
    visitors: ['manage_visitors'],
    manage_pastoral: ['pastoral'],
    pastoral: ['manage_pastoral'],
    manage_departments: ['departments'],
    departments: ['manage_departments'],
    manage_events: ['events'],
    events: ['manage_events'],
    manage_staff: ['staff'],
    staff: ['manage_staff'],
    manage_settings: ['settings'],
    settings: ['manage_settings'],
    view_reports: ['reports', 'giving'],
    reports: ['view_reports'],
  };

  const aliases = aliasMap[permission] || [];
  return aliases.some(alias => userPerms.includes(alias));
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
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
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
    contributionSmsTemplate?: string;
    absenceSmsEnabled: boolean;
    absenceSmsDelayMinutes: number;
    absenceSmsTemplate: string;
    absenceTriggerServices: string[];
    titheConfirmationSmsEnabled?: boolean;
    titheConfirmationTemplate?: string;
    titheReminderEnabled: boolean;
    titheReminderTemplate: string;
    titheReminderFrequency: 'weekly' | 'monthly';
  };
  createdAt: string;
  memberCount?: number;
  adminUsername?: string;
}

export interface Member {
  id: string;
  churchId: string;
  memberCode: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dateOfBirth?: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  address?: string;
  occupation?: string;
  maritalStatus: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  membershipStatus: 'Active' | 'Inactive' | 'Under Discipline' | 'Transferred' | 'Deceased';
  joinDate: string;
  baptismStatus: 'Baptized' | 'Not Baptized' | 'Pending';
  familyId?: string;
  familyRole?: string;
  departmentIds: string[];
  ministryIds: string[];
  groupIds: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface ChurchService {
  id: string;
  churchId: string;
  serviceName: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  preacher?: string;
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
  serviceName: string;
  serviceDate: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  status: 'Present' | 'Absent' | 'Excused';
  checkInTime?: string;
  checkInMethod: 'Manual' | 'QR' | 'Admin';
  markedBy: string;
  createdAt: string;
}

export interface GivingRecord {
  id: string;
  churchId: string;
  memberId?: string;
  memberName: string;
  phone?: string;
  amount: number;
  currency: string;
  givingType: 'Tithe' | 'Offering' | 'First Fruit' | 'Thanksgiving' | 'Building Fund' | 'Missions' | 'Welfare' | 'Special Offering' | 'Special Contributions' | 'Donation' | string;
  date: string;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque';
  referenceNumber: string;
  campaignOrProject?: string;
  receiptNumber: string;
  notes?: string;
  smsSent: boolean;
  smsMessageId?: string;
  recordedBy: string;
  createdAt: string;
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
  approvalStatus: 'Approved' | 'Pending' | 'Rejected';
  description: string;
  recordedBy: string;
  createdAt: string;
}

export interface Visitor {
  id: string;
  churchId: string;
  fullName: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  visitDate: string;
  serviceAttended: string;
  invitedBy?: string;
  followUpStatus: 'New' | 'Contacted' | 'Visited' | 'Joined' | 'Not Interested';
  assignedPastorLeader?: string;
  notes?: string;
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
  assignedLeader?: string;
  followUpStatus: 'New' | 'Contacted' | 'In Foundation Class' | 'Baptized' | 'Integrated' | 'Lost';
  discipleshipStatus: string;
  notes?: string;
  createdAt: string;
}

export interface PastoralCase {
  id: string;
  churchId: string;
  memberId?: string;
  caseType: string;
  customCaseType?: string;
  isCustom?: boolean;
  memberNameOrSubject?: string;
  memberName?: string;
  phone: string;
  assignedPastor?: string;
  pastorAssigned?: string;
  priority?: string;
  urgencyLevel?: string;
  status: string;
  summary?: string;
  counselingNotes?: string;
  confidentialNotes?: string;
  openedDate?: string;
  followUpDate?: string;
  history?: Array<{ date: string; action: string; notes: string; by: string }>;
  createdAt: string;
}

export type PastoralCareCase = PastoralCase;

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
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  memberCount: number;
  description?: string;
  createdAt: string;
}

export interface ChurchNotification {
  id: string;
  churchId?: string;
  title: string;
  message: string;
  category: 'FINANCE' | 'SMS' | 'EVENT' | 'MEMBER' | 'PASTORAL' | 'SYSTEM';
  severity?: 'info' | 'success' | 'warning' | 'error';
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
  description?: string;
  organizer?: string;
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
  notificationType: 'CONTRIBUTION_CONFIRMATION' | 'ABSENCE_FOLLOWUP' | 'TITHE_CONFIRMATION' | 'TITHE_REMINDER' | 'GIVING_REMINDER' | 'VISITOR_WELCOME' | 'VISITOR_FOLLOWUP' | 'NEW_MEMBER' | 'BROADCAST' | 'BULK_ANNOUNCEMENT' | 'EVENT_REMINDER' | 'BIRTHDAY_GREETING' | 'CUSTOM' | 'TEST';
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

export interface MemberBirthday {
  memberId: string;
  fullName: string;
  phone: string;
  normalizedPhone?: string;
  dateOfBirth: string;
  birthDateFormatted: string;
  dayOfWeek: string;
  isToday: boolean;
  isTomorrow: boolean;
  daysDiff: number;
  age?: number;
  gender: 'Male' | 'Female';
  departmentIds?: string[];
  alreadySentToday?: boolean;
}

export interface UpcomingBirthdaysData {
  weekRange: string;
  totalThisWeek: number;
  todayCount: number;
  upcomingCount: number;
  birthdays: MemberBirthday[];
}

export interface AuditLog {
  id: string;
  churchId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  tier: 'starter' | 'growth' | 'enterprise';
  priceGHS: number;
  billingFrequency: 'monthly' | 'yearly';
  smsCreditsIncluded: number;
  maxMembers: number;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
}

export interface PopupMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'announcement' | 'maintenance';
  targetAudience: 'all' | 'church_admins' | 'members';
  isActive: boolean;
  dismissible: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'billing' | 'sms_gateway' | 'feature';
  targetAudience: 'all' | 'church_admins' | 'members';
  sentBy: string;
  createdAt: string;
}
