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
  churchId?: string; // null for SUPER_ADMIN
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
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
  notificationType: 'CONTRIBUTION_CONFIRMATION' | 'ABSENCE_FOLLOWUP' | 'TITHE_CONFIRMATION' | 'TITHE_REMINDER' | 'GIVING_REMINDER' | 'VISITOR_WELCOME' | 'VISITOR_FOLLOWUP' | 'NEW_MEMBER' | 'BROADCAST' | 'EVENT_REMINDER' | 'BULK_ANNOUNCEMENT' | 'BIRTHDAY_GREETING' | 'CUSTOM' | 'TEST';
  relatedContributionId?: string;
  relatedReceiptNumber?: string;
  status: 'Queued' | 'Sending' | 'Accepted' | 'Delivered' | 'Submitted' | 'Failed' | 'Unable to Send';
  unitsDeducted?: number;
  ratePerUnitGHS?: number;
  costGHS?: number;
  providerResponse?: string;
  providerMessageId?: string;
  failureReason?: string;
  idempotencyKey?: string;
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

  const seedPopupMessages: PopupMessage[] = [
    {
      id: 'pop_001',
      title: 'Scheduled System Maintenance',
      message: 'Church-OS Central Gateway routine network optimization will occur this Sunday from 23:00 to 23:30 GMT.',
      type: 'INFO',
      targetAudience: 'ALL',
      active: true,
      createdAt: now,
      createdBy: 'Super Administrator',
    },
  ];

  const seedSystemNotifications: SystemNotification[] = [
    {
      id: 'notif_001',
      title: 'Central SMS Gateway Operational',
      message: 'Direct telecom interconnect is online and performing with zero queuing delay.',
      severity: 'low',
      category: 'SMS',
      isRead: false,
      createdAt: now,
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
    const cleanData = sanitizeForFirestore({ ...data });
    delete (cleanData as any).id; // Avoid duplicate id inside data body
    const docRef = doc(this.firestore, collectionName, docId);
    await setDoc(docRef, cleanData, { merge: true });
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
    const docRef = doc(this.firestore, collectionName, docId);
    await deleteDoc(docRef);
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
