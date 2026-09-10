import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  username: string; // e.g. "su@admin" or email
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'CHURCH_OWNER' | 'CHURCH_ADMINISTRATOR' | 'SENIOR_PASTOR' | 'PASTOR_MINISTER' | 'FINANCE_OFFICER' | 'DEPARTMENT_LEADER' | 'GROUP_LEADER' | 'SECRETARY' | 'MEMBER';
  churchId?: string; // null for SUPER_ADMIN
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
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
    titheReminderFrequency: 'weekly' | 'monthly' | 'campaign';
  };
  createdAt: string;
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

export interface GivingRecord {
  id: string;
  churchId: string;
  receiptNumber: string;
  referenceNumber?: string;
  givingType: 'Tithe' | 'Offering' | 'Building Fund' | 'Missions' | 'Welfare' | 'Thanksgiving' | 'First Fruit' | 'Special Offering' | 'Donation' | 'Other';
  amount: number;
  currency: string;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'POS Card' | 'Cheque';
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
  caseType: 'Prayer Request' | 'Counselling' | 'Hospital Visit' | 'Home Visit' | 'Welfare Case' | 'Bereavement';
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
  type: 'department' | 'ministry' | 'cell_group';
  leaderName: string;
  leaderPhone: string;
  meetingDay: string;
  meetingTime: string;
  meetingLocation: string;
  memberCount: number;
  description: string;
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
  description: string;
  organizer: string;
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
  notificationType: 'ABSENCE_FOLLOWUP' | 'TITHE_CONFIRMATION' | 'TITHE_REMINDER' | 'GIVING_REMINDER' | 'VISITOR_WELCOME' | 'VISITOR_FOLLOWUP' | 'NEW_MEMBER' | 'BROADCAST' | 'EVENT_REMINDER' | 'BULK_ANNOUNCEMENT' | 'CUSTOM' | 'TEST';
  status: 'Queued' | 'Sending' | 'Accepted' | 'Delivered' | 'Submitted' | 'Failed' | 'Unable to Send';
  providerResponse?: string;
  providerMessageId?: string;
  failureReason?: string;
  idempotencyKey?: string;
  sentAt?: string;
  createdAt: string;
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

export interface DatabaseSchema {
  users: User[];
  churches: Church[];
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
  smsMessages: SmsMessage[];
  auditLogs: AuditLog[];
  platformSettings: CentralPlatformSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'church_os_db.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_church_os_salt_2026').digest('hex');
}

export function getInitialDb(): DatabaseSchema {
  const superAdminPasswordHash = hashPassword('suadmin123');
  const now = new Date().toISOString();

  // Initial Super Admin user (credentials: su@admin / suadmin123 or superadmin)
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
      details: 'Church-OS multi-tenant instance initialized without dummy data.',
      timestamp: now,
    },
  ];

  return {
    users: [superAdminUser],
    churches: [],
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
    smsMessages: [],
    auditLogs: seedAuditLogs,
    platformSettings: seedPlatformSettings,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        // Verify critical superadmin user exists and is properly configured
        const superAdmin = parsed.users && parsed.users.find(u => u.role === 'SUPER_ADMIN');
        if (!superAdmin) {
          const fresh = getInitialDb();
          parsed.users = [...(parsed.users || []), ...fresh.users.filter(u => u.role === 'SUPER_ADMIN')];
          this.saveData(parsed);
        } else {
          // Ensure valid password hash for suadmin123 and su@admin username availability
          const validHash = hashPassword('suadmin123');
          let modified = false;
          if (superAdmin.username !== 'su@admin' && superAdmin.username !== 'superadmin') {
            superAdmin.username = 'su@admin';
            modified = true;
          }
          if (superAdmin.status !== 'ACTIVE') {
            superAdmin.status = 'ACTIVE';
            modified = true;
          }
          if (modified) {
            this.saveData(parsed);
          }
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading DB_FILE, creating fresh DB:', err);
    }
    const initial = getInitialDb();
    this.saveData(initial);
    return initial;
  }

  public saveData(data?: DatabaseSchema): void {
    if (data) {
      this.data = data;
    }
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file atomically:', err);
      // Fallback
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    }
  }

  public get<K extends keyof DatabaseSchema>(table: K): DatabaseSchema[K] {
    return this.data[table];
  }

  public update<K extends keyof DatabaseSchema>(table: K, mutator: (current: DatabaseSchema[K]) => DatabaseSchema[K]): DatabaseSchema[K] {
    this.data[table] = mutator(this.data[table]);
    this.saveData();
    return this.data[table];
  }

  public getRaw(): DatabaseSchema {
    return this.data;
  }

  public resetToClean(): void {
    const clean = getInitialDb();
    this.saveData(clean);
  }
}

export const db = new Database();
