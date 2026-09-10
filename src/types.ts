export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'CHURCH_OWNER' | 'CHURCH_ADMINISTRATOR' | 'SENIOR_PASTOR' | 'PASTOR_MINISTER' | 'FINANCE_OFFICER' | 'DEPARTMENT_LEADER' | 'GROUP_LEADER' | 'SECRETARY' | 'MEMBER';
  churchId?: string;
  phone?: string;
  status: 'ACTIVE' | 'SUSPENDED';
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
    absenceSmsEnabled: boolean;
    absenceSmsDelayMinutes: number;
    absenceSmsTemplate: string;
    absenceTriggerServices: string[];
    titheConfirmationSmsEnabled: boolean;
    titheConfirmationTemplate: string;
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
  givingType: 'Tithe' | 'Offering' | 'First Fruit' | 'Thanksgiving' | 'Building Fund' | 'Missions' | 'Welfare' | 'Special Offering' | 'Donation';
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
  caseType: string;
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
  type: 'department' | 'ministry' | 'cell_group';
  leaderName: string;
  leaderPhone: string;
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  memberCount: number;
  description?: string;
  createdAt: string;
}

export interface ChurchEvent {
  id: string;
  churchId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description?: string;
  organizer?: string;
  reminderScheduled: boolean;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface SmsMessage {
  id: string;
  churchId: string;
  churchName?: string;
  recipientName: string;
  phone: string;
  normalizedPhone: string;
  senderName: string;
  message: string;
  notificationType: 'ABSENCE_FOLLOWUP' | 'TITHE_CONFIRMATION' | 'GIVING_REMINDER' | 'VISITOR_FOLLOWUP' | 'NEW_MEMBER' | 'BULK_ANNOUNCEMENT' | 'EVENT_REMINDER' | 'CUSTOM' | 'TEST';
  status: 'Queued' | 'Sending' | 'Accepted' | 'Delivered' | 'Failed' | 'Unable to Send';
  providerResponse?: string;
  providerMessageId?: string;
  failureReason?: string;
  idempotencyKey?: string;
  sentAt?: string;
  createdAt: string;
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
