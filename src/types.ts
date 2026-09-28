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
  roles?: string[]; // Multiple assigned roles
  customRoleTitle?: string;
  permissions?: string[];
  churchId?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isPrimaryAccount?: boolean;
  isAssignedRole?: boolean;
  accountType?: 'CHURCH_ACCOUNT' | 'ASSIGNED_MEMBER_ROLE';
  assignedMemberId?: string;
  assignedMemberName?: string;
  lastLoginAt?: string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  CHURCH_OWNER: ['dashboard', 'members', 'attendance', 'sms', 'giving', 'expenses', 'visitors', 'pastoral', 'departments', 'events', 'tasks', 'staff', 'settings'],
  CHURCH_ADMINISTRATOR: ['dashboard', 'members', 'attendance', 'sms', 'giving', 'expenses', 'visitors', 'pastoral', 'departments', 'events', 'tasks', 'staff', 'settings'],
  ADMINISTRATOR: ['dashboard', 'members', 'attendance', 'sms', 'giving', 'expenses', 'visitors', 'pastoral', 'departments', 'events', 'tasks', 'staff', 'settings'],
  ACCOUNTANT: ['dashboard', 'giving', 'expenses'],
  TREASURER: ['dashboard', 'giving', 'expenses'],
  FINANCE_OFFICER: ['dashboard', 'giving', 'expenses'],
  ATTENDANCE_OFFICER: ['dashboard', 'attendance'],
  MEMBER_MANAGER: ['dashboard', 'members'],
  SMS_MANAGER: ['dashboard', 'sms'],
  PASTOR: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events'],
  SENIOR_PASTOR: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events', 'departments', 'sms', 'tasks'],
  ASSISTANT_PASTOR: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events'],
  PASTOR_MINISTER: ['dashboard', 'members', 'pastoral', 'attendance', 'visitors', 'events'],
  SECRETARY: ['dashboard', 'members', 'attendance', 'visitors', 'events', 'sms'],
  EVENT_COORDINATOR: ['dashboard', 'events', 'tasks'],
  DEPARTMENT_LEADER: ['dashboard', 'departments', 'attendance', 'events'],
  GROUP_LEADER: ['dashboard', 'departments', 'attendance', 'events'],
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
  | 'manage_tasks'
  | 'manage_staff'
  | 'manage_settings'
  | 'view_reports';

export type ChurchStaffRole =
  | 'ACCOUNTANT'
  | 'ATTENDANCE_OFFICER'
  | 'MEMBER_MANAGER'
  | 'SMS_MANAGER'
  | 'PASTOR'
  | 'ASSISTANT_PASTOR'
  | 'TREASURER'
  | 'SECRETARY'
  | 'FINANCE_OFFICER'
  | 'EVENT_COORDINATOR'
  | 'DEPARTMENT_LEADER'
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
  'manage_tasks',
  'manage_staff',
  'manage_settings',
  'view_reports',
];

// Helper to calculate exact union of permissions from selected roles
export interface CustomRole {
  id: string;
  churchId: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  assignedStaffCount?: number;
}

export interface PredefinedRoleDefinition {
  key: string;
  name: string;
  label: string;
  description: string;
  category: string;
  permissions: string[];
}

export interface PermissionActionDefinition {
  key: string;
  label: string;
}

export interface PermissionCategoryDefinition {
  id: string;
  name: string;
  description: string;
  actions: { id: string; name: string; permission: string }[];
}

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export',
  'send',
] as const;

export const PERMISSION_CATEGORIES_CATALOG: PermissionCategoryDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Overview analytics, summary statistics, and health metrics',
    actions: [
      { id: 'view', name: 'View Dashboard', permission: 'dashboard:view' },
      { id: 'export', name: 'Export Dashboard Metrics', permission: 'dashboard:export' },
    ],
  },
  {
    id: 'members',
    name: 'Members',
    description: 'Church membership directory, demographics, and life records',
    actions: [
      { id: 'view', name: 'View Members', permission: 'members:view' },
      { id: 'create', name: 'Add Members', permission: 'members:create' },
      { id: 'edit', name: 'Edit Members', permission: 'members:edit' },
      { id: 'delete', name: 'Delete Members', permission: 'members:delete' },
      { id: 'export', name: 'Export Members Directory', permission: 'members:export' },
    ],
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Service attendance tracking, headcounts, and check-ins',
    actions: [
      { id: 'view', name: 'View Attendance', permission: 'attendance:view' },
      { id: 'create', name: 'Take Attendance', permission: 'attendance:create' },
      { id: 'edit', name: 'Edit Attendance', permission: 'attendance:edit' },
      { id: 'delete', name: 'Delete Attendance', permission: 'attendance:delete' },
      { id: 'export', name: 'Export Attendance Reports', permission: 'attendance:export' },
    ],
  },
  {
    id: 'tithes',
    name: 'Tithes',
    description: 'Tithe recording, donor receipts, and tithe statements',
    actions: [
      { id: 'view', name: 'View Tithes', permission: 'tithes:view' },
      { id: 'create', name: 'Record Tithes', permission: 'tithes:create' },
      { id: 'edit', name: 'Edit Tithes', permission: 'tithes:edit' },
      { id: 'delete', name: 'Delete Tithes', permission: 'tithes:delete' },
      { id: 'export', name: 'Export Tithes Ledger', permission: 'tithes:export' },
    ],
  },
  {
    id: 'offerings',
    name: 'Offerings',
    description: 'General Sunday and midweek offerings collection',
    actions: [
      { id: 'view', name: 'View Offerings', permission: 'offerings:view' },
      { id: 'create', name: 'Record Offerings', permission: 'offerings:create' },
      { id: 'edit', name: 'Edit Offerings', permission: 'offerings:edit' },
      { id: 'delete', name: 'Delete Offerings', permission: 'offerings:delete' },
      { id: 'export', name: 'Export Offerings Data', permission: 'offerings:export' },
    ],
  },
  {
    id: 'donations',
    name: 'Donations',
    description: 'Special pledges, donor gifts, and designated contributions',
    actions: [
      { id: 'view', name: 'View Donations', permission: 'donations:view' },
      { id: 'create', name: 'Record Donations', permission: 'donations:create' },
      { id: 'edit', name: 'Edit Donations', permission: 'donations:edit' },
      { id: 'delete', name: 'Delete Donations', permission: 'donations:delete' },
      { id: 'export', name: 'Export Donations', permission: 'donations:export' },
    ],
  },
  {
    id: 'special_giving',
    name: 'Special Giving',
    description: 'Thanksgiving seed, harvest, conventions, and anniversary funds',
    actions: [
      { id: 'view', name: 'View Special Giving', permission: 'special_giving:view' },
      { id: 'create', name: 'Record Special Giving', permission: 'special_giving:create' },
      { id: 'edit', name: 'Edit Special Giving', permission: 'special_giving:edit' },
      { id: 'delete', name: 'Delete Special Giving', permission: 'special_giving:delete' },
      { id: 'export', name: 'Export Special Giving', permission: 'special_giving:export' },
    ],
  },
  {
    id: 'building_fund',
    name: 'Building Fund',
    description: 'Capital campaigns, infrastructure projects, and building pledges',
    actions: [
      { id: 'view', name: 'View Building Fund', permission: 'building_fund:view' },
      { id: 'create', name: 'Record Building Fund', permission: 'building_fund:create' },
      { id: 'edit', name: 'Edit Building Fund', permission: 'building_fund:edit' },
      { id: 'delete', name: 'Delete Building Fund', permission: 'building_fund:delete' },
      { id: 'export', name: 'Export Building Fund Reports', permission: 'building_fund:export' },
    ],
  },
  {
    id: 'missions',
    name: 'Missions',
    description: 'Missions support, church planting funds, and outreach giving',
    actions: [
      { id: 'view', name: 'View Missions', permission: 'missions:view' },
      { id: 'create', name: 'Record Missions Giving', permission: 'missions:create' },
      { id: 'edit', name: 'Edit Missions Giving', permission: 'missions:edit' },
      { id: 'delete', name: 'Delete Missions Giving', permission: 'missions:delete' },
      { id: 'export', name: 'Export Missions Ledgers', permission: 'missions:export' },
    ],
  },
  {
    id: 'welfare',
    name: 'Welfare',
    description: 'Benevolence funds, member assistance, and community welfare aid',
    actions: [
      { id: 'view', name: 'View Welfare', permission: 'welfare:view' },
      { id: 'create', name: 'Record Welfare Giving / Aid', permission: 'welfare:create' },
      { id: 'edit', name: 'Edit Welfare Records', permission: 'welfare:edit' },
      { id: 'delete', name: 'Delete Welfare Records', permission: 'welfare:delete' },
      { id: 'approve', name: 'Approve Welfare Disbursements', permission: 'welfare:approve' },
      { id: 'export', name: 'Export Welfare Reports', permission: 'welfare:export' },
    ],
  },
  {
    id: 'expenses',
    name: 'Expenses',
    description: 'Operational disbursements, bills, equipment, and vouchers',
    actions: [
      { id: 'view', name: 'View Expenses', permission: 'expenses:view' },
      { id: 'create', name: 'Create Expense Voucher', permission: 'expenses:create' },
      { id: 'edit', name: 'Edit Expenses', permission: 'expenses:edit' },
      { id: 'delete', name: 'Delete Expenses', permission: 'expenses:delete' },
      { id: 'approve', name: 'Approve Expenses', permission: 'expenses:approve' },
      { id: 'export', name: 'Export Expenses', permission: 'expenses:export' },
    ],
  },
  {
    id: 'financial_reports',
    name: 'Financial Reports',
    description: 'Income statements, balance sheets, cash flow, and audit summaries',
    actions: [
      { id: 'view', name: 'View Financial Reports', permission: 'financial_reports:view' },
      { id: 'approve', name: 'Approve / Certify Financials', permission: 'financial_reports:approve' },
      { id: 'export', name: 'Export Financial Reports', permission: 'financial_reports:export' },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Church calendar, conventions, rehearsals, and program schedules',
    actions: [
      { id: 'view', name: 'View Events', permission: 'events:view' },
      { id: 'create', name: 'Create Events', permission: 'events:create' },
      { id: 'edit', name: 'Edit Events', permission: 'events:edit' },
      { id: 'delete', name: 'Delete Events', permission: 'events:delete' },
      { id: 'export', name: 'Export Events Calendar', permission: 'events:export' },
    ],
  },
  {
    id: 'departments',
    name: 'Departments',
    description: 'Ministry departments, cells, committees, and choir groups',
    actions: [
      { id: 'view', name: 'View Departments', permission: 'departments:view' },
      { id: 'create', name: 'Create Department', permission: 'departments:create' },
      { id: 'edit', name: 'Edit Department', permission: 'departments:edit' },
      { id: 'delete', name: 'Delete Department', permission: 'departments:delete' },
      { id: 'export', name: 'Export Department Rosters', permission: 'departments:export' },
    ],
  },
  {
    id: 'staff',
    name: 'Staff/User Management',
    description: 'Manage staff credentials, assigned roles, custom roles, and security',
    actions: [
      { id: 'view', name: 'View Staff & Roles', permission: 'staff:view' },
      { id: 'create', name: 'Assign Roles / Add Staff', permission: 'staff:create' },
      { id: 'edit', name: 'Edit Roles & Permissions', permission: 'staff:edit' },
      { id: 'delete', name: 'Revoke Roles / Delete Staff', permission: 'staff:delete' },
      { id: 'approve', name: 'Authorize Staff Onboarding', permission: 'staff:approve' },
      { id: 'export', name: 'Export Staff Roster', permission: 'staff:export' },
    ],
  },
  {
    id: 'sms',
    name: 'SMS/Communication',
    description: 'Direct SMS messaging, bulk broadcasts, and delivery logs',
    actions: [
      { id: 'view', name: 'View SMS Logs', permission: 'sms:view' },
      { id: 'send', name: 'Send SMS & Reminders', permission: 'sms:send' },
      { id: 'create', name: 'Draft SMS Templates', permission: 'sms:create' },
      { id: 'export', name: 'Export Delivery Reports', permission: 'sms:export' },
    ],
  },
  {
    id: 'announcements',
    name: 'Announcements',
    description: 'Church bulletin notices, pulpit announcements, and push alerts',
    actions: [
      { id: 'view', name: 'View Announcements', permission: 'announcements:view' },
      { id: 'create', name: 'Create Announcement', permission: 'announcements:create' },
      { id: 'edit', name: 'Edit Announcement', permission: 'announcements:edit' },
      { id: 'delete', name: 'Delete Announcement', permission: 'announcements:delete' },
      { id: 'send', name: 'Publish / Broadcast Announcements', permission: 'announcements:send' },
    ],
  },
  {
    id: 'pastoral',
    name: 'Pastoral Functions',
    description: 'Confidential counseling, visitation records, and spiritual care',
    actions: [
      { id: 'view', name: 'View Pastoral Records', permission: 'pastoral:view' },
      { id: 'create', name: 'Create Pastoral Case', permission: 'pastoral:create' },
      { id: 'edit', name: 'Edit Pastoral Case', permission: 'pastoral:edit' },
      { id: 'delete', name: 'Delete Pastoral Case', permission: 'pastoral:delete' },
      { id: 'export', name: 'Export Pastoral Logs', permission: 'pastoral:export' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Comprehensive church growth, attendance, and ministry analytics',
    actions: [
      { id: 'view', name: 'View Reports', permission: 'reports:view' },
      { id: 'export', name: 'Export Analytics Reports', permission: 'reports:export' },
    ],
  },
  {
    id: 'settings',
    name: 'Church Settings',
    description: 'Church configuration, currencies, SMS sender ID, and integrations',
    actions: [
      { id: 'view', name: 'View Church Settings', permission: 'settings:view' },
      { id: 'edit', name: 'Modify Church Settings', permission: 'settings:edit' },
    ],
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs',
    description: 'Immutable record of staff logins, permission modifications, and financial actions',
    actions: [
      { id: 'view', name: 'View Audit Logs', permission: 'audit_logs:view' },
      { id: 'export', name: 'Export Audit Trail', permission: 'audit_logs:export' },
    ],
  },
];

export const PREDEFINED_ROLES: PredefinedRoleDefinition[] = [
  {
    key: 'pastor',
    name: 'Pastor',
    label: 'Pastor',
    category: 'Leadership & Spiritual',
    description: 'Full pastoral care, membership oversight, services, attendance, events, and reports access.',
    permissions: [
      'dashboard:view', 'dashboard:export',
      'members:view', 'members:create', 'members:edit', 'members:export',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:export',
      'events:view', 'events:create', 'events:edit', 'events:export',
      'departments:view', 'departments:edit',
      'pastoral:view', 'pastoral:create', 'pastoral:edit', 'pastoral:export',
      'sms:view', 'sms:send',
      'announcements:view', 'announcements:create', 'announcements:edit', 'announcements:send',
      'reports:view', 'reports:export',
    ],
  },
  {
    key: 'administrator',
    name: 'Administrator',
    label: 'Administrator',
    category: 'Administration & Operations',
    description: 'Comprehensive administrative oversight across members, staff, communication, events, and church settings.',
    permissions: [
      'dashboard:view', 'dashboard:export',
      'members:view', 'members:create', 'members:edit', 'members:delete', 'members:export',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:delete', 'attendance:export',
      'tithes:view', 'offerings:view', 'donations:view', 'special_giving:view', 'building_fund:view', 'missions:view', 'welfare:view',
      'expenses:view', 'financial_reports:view',
      'events:view', 'events:create', 'events:edit', 'events:delete', 'events:export',
      'departments:view', 'departments:create', 'departments:edit', 'departments:delete', 'departments:export',
      'staff:view', 'staff:create', 'staff:edit', 'staff:delete', 'staff:approve', 'staff:export',
      'sms:view', 'sms:send', 'sms:create', 'sms:export',
      'announcements:view', 'announcements:create', 'announcements:edit', 'announcements:delete', 'announcements:send',
      'pastoral:view', 'pastoral:create', 'pastoral:edit', 'pastoral:export',
      'reports:view', 'reports:export',
      'settings:view', 'settings:edit',
      'audit_logs:view', 'audit_logs:export',
    ],
  },
  {
    key: 'accounts_officer',
    name: 'Accounts Officer',
    label: 'Accounts Officer',
    category: 'Finance & Accounting',
    description: 'Day-to-day financial data entry: tithes, offerings, donations, vouchers, and accounts reconciliation.',
    permissions: [
      'dashboard:view',
      'tithes:view', 'tithes:create', 'tithes:edit', 'tithes:export',
      'offerings:view', 'offerings:create', 'offerings:edit', 'offerings:export',
      'donations:view', 'donations:create', 'donations:edit', 'donations:export',
      'special_giving:view', 'special_giving:create', 'special_giving:edit', 'special_giving:export',
      'building_fund:view', 'building_fund:create', 'building_fund:edit', 'building_fund:export',
      'missions:view', 'missions:create', 'missions:edit', 'missions:export',
      'welfare:view', 'welfare:create', 'welfare:edit', 'welfare:export',
      'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:export',
      'financial_reports:view', 'financial_reports:export',
      'reports:view', 'reports:export',
    ],
  },
  {
    key: 'treasurer',
    name: 'Treasurer',
    label: 'Treasurer',
    category: 'Finance & Accounting',
    description: 'Custody of church finances, approving expenses, authorizing disbursements, and certifying reports.',
    permissions: [
      'dashboard:view', 'dashboard:export',
      'tithes:view', 'tithes:export',
      'offerings:view', 'offerings:export',
      'donations:view', 'donations:export',
      'special_giving:view', 'special_giving:export',
      'building_fund:view', 'building_fund:export',
      'missions:view', 'missions:export',
      'welfare:view', 'welfare:approve', 'welfare:export',
      'expenses:view', 'expenses:approve', 'expenses:export',
      'financial_reports:view', 'financial_reports:approve', 'financial_reports:export',
      'reports:view', 'reports:export',
    ],
  },
  {
    key: 'secretary',
    name: 'Secretary',
    label: 'Secretary',
    category: 'Administration & Operations',
    description: 'Managing membership records, service attendance, visitor tracking, calendar, announcements, and SMS.',
    permissions: [
      'dashboard:view',
      'members:view', 'members:create', 'members:edit', 'members:export',
      'attendance:view', 'attendance:create', 'attendance:edit', 'attendance:export',
      'events:view', 'events:create', 'events:edit', 'events:export',
      'departments:view',
      'sms:view', 'sms:send', 'sms:create',
      'announcements:view', 'announcements:create', 'announcements:edit', 'announcements:send',
      'reports:view',
    ],
  },
  {
    key: 'auditor',
    name: 'Auditor',
    label: 'Auditor',
    category: 'Audit & Governance',
    description: 'Independent inspection of all financial books, expenses, contribution receipts, and security audit logs.',
    permissions: [
      'dashboard:view',
      'tithes:view', 'tithes:export',
      'offerings:view', 'offerings:export',
      'donations:view', 'donations:export',
      'special_giving:view', 'special_giving:export',
      'building_fund:view', 'building_fund:export',
      'missions:view', 'missions:export',
      'welfare:view', 'welfare:export',
      'expenses:view', 'expenses:export',
      'financial_reports:view', 'financial_reports:approve', 'financial_reports:export',
      'reports:view', 'reports:export',
      'audit_logs:view', 'audit_logs:export',
    ],
  },
  {
    key: 'welfare_officer',
    name: 'Welfare Officer',
    label: 'Welfare Officer',
    category: 'Pastoral & Benevolence',
    description: 'Caring for vulnerable members, processing welfare requests, hospital visitations, and benevolence.',
    permissions: [
      'dashboard:view',
      'members:view',
      'welfare:view', 'welfare:create', 'welfare:edit', 'welfare:approve', 'welfare:export',
      'pastoral:view', 'pastoral:create', 'pastoral:edit',
      'sms:view', 'sms:send',
    ],
  },
  {
    key: 'usher',
    name: 'Usher',
    label: 'Usher',
    category: 'Services & Operations',
    description: 'Taking service headcount, logging attendance numbers, welcoming visitors, and seating congregation.',
    permissions: [
      'dashboard:view',
      'attendance:view', 'attendance:create',
      'members:view',
      'events:view',
    ],
  },
  {
    key: 'youth_leader',
    name: 'Youth Leader',
    label: 'Youth Leader',
    category: 'Ministries & Auxiliaries',
    description: 'Leading youth wing, coordinating youth services, tracking youth attendance, and sending youth notices.',
    permissions: [
      'dashboard:view',
      'members:view',
      'attendance:view', 'attendance:create',
      'events:view', 'events:create', 'events:edit',
      'departments:view', 'departments:edit',
      'sms:view', 'sms:send',
      'announcements:view', 'announcements:create',
    ],
  },
  {
    key: 'childrens_ministry',
    name: "Children's Ministry",
    label: "Children's Ministry",
    category: 'Ministries & Auxiliaries',
    description: "Managing Sunday School / children's church, child attendance check-ins, and guardian communications.",
    permissions: [
      'dashboard:view',
      'members:view', 'members:create', 'members:edit',
      'attendance:view', 'attendance:create', 'attendance:edit',
      'events:view', 'events:create',
      'departments:view',
      'sms:view', 'sms:send',
    ],
  },
  {
    key: 'evangelism_officer',
    name: 'Evangelism Officer',
    label: 'Evangelism Officer',
    category: 'Outreach & Missions',
    description: 'Recording outreach converts, welcoming new visitors, tracking follow-up visits, and missionary giving.',
    permissions: [
      'dashboard:view',
      'members:view', 'members:create',
      'attendance:view',
      'events:view', 'events:create',
      'missions:view', 'missions:create',
      'pastoral:view', 'pastoral:create', 'pastoral:edit',
      'sms:view', 'sms:send',
    ],
  },
  {
    key: 'choir_leader',
    name: 'Choir/Music Leader',
    label: 'Choir/Music Leader',
    category: 'Ministries & Auxiliaries',
    description: 'Organizing praise & worship team, choir rehearsals, music ministrations, and departmental roster.',
    permissions: [
      'dashboard:view',
      'members:view',
      'attendance:view', 'attendance:create',
      'events:view', 'events:create', 'events:edit',
      'departments:view', 'departments:edit',
      'sms:view', 'sms:send',
    ],
  },
  {
    key: 'department_leader',
    name: 'Department Leader',
    label: 'Department Leader',
    category: 'Ministries & Auxiliaries',
    description: 'Leadership of an assigned ministry or fellowship cell, coordinating meetings and member attendance.',
    permissions: [
      'dashboard:view',
      'members:view',
      'attendance:view', 'attendance:create',
      'events:view', 'events:create', 'events:edit',
      'departments:view', 'departments:edit',
      'sms:view', 'sms:send',
    ],
  },
  {
    key: 'communication_officer',
    name: 'Communication Officer',
    label: 'Communication Officer',
    category: 'Media & Public Relations',
    description: 'Managing church SMS broadcasts, announcements, publicity, event promos, and public communications.',
    permissions: [
      'dashboard:view',
      'sms:view', 'sms:send', 'sms:create', 'sms:export',
      'announcements:view', 'announcements:create', 'announcements:edit', 'announcements:delete', 'announcements:send',
      'events:view', 'events:create', 'events:edit',
      'members:view',
    ],
  },
  {
    key: 'viewer_readonly',
    name: 'Viewer/Read Only',
    label: 'Viewer/Read Only',
    category: 'Observation & Inspection',
    description: 'Strict read-only visibility into general dashboard, member directory, church events, and public reports.',
    permissions: [
      'dashboard:view',
      'members:view',
      'events:view',
      'reports:view',
    ],
  },
];

export function getCombinedPermissionsForRoles(roles: string[], customRolesMap?: Record<string, string[]>): string[] {
  if (!roles || roles.length === 0) return ['dashboard:view'];
  const combined = new Set<string>();

  for (const r of roles) {
    const cleanR = r.trim().toLowerCase();
    const predefined = PREDEFINED_ROLES.find(
      pr => pr.name.toLowerCase() === cleanR ||
            pr.key.toLowerCase() === cleanR ||
            pr.label.toLowerCase() === cleanR
    );

    if (predefined) {
      predefined.permissions.forEach(p => combined.add(p));
      continue;
    }

    if (customRolesMap && customRolesMap[r]) {
      customRolesMap[r].forEach(p => combined.add(p));
      continue;
    }

    // Check old fallback default permissions
    const legacyPerms = DEFAULT_ROLE_PERMISSIONS[r] || DEFAULT_ROLE_PERMISSIONS[r.toUpperCase()];
    if (legacyPerms) {
      legacyPerms.forEach(p => combined.add(p));
    }
  }

  return Array.from(combined);
}

export function hasPermission(
  user: { role?: string; roles?: string[]; permissions?: string[]; isPrimaryAccount?: boolean; accountType?: string; isAssignedRole?: boolean } | null | undefined,
  permission: string
): boolean {
  if (!user) return false;

  // Platform Super Admin has universal access
  if (user.role === 'SUPER_ADMIN') return true;

  // Registered church owner has all church modules
  if (user.role === 'CHURCH_OWNER') return true;

  // Primary church registered administrator account (not an assigned staff role)
  if (user.role === 'CHURCH_ADMINISTRATOR' && !user.isAssignedRole && !user.accountType) {
    return true;
  }

  // Authoritative permissions assigned directly to user
  const userPerms: string[] = Array.isArray(user.permissions) && user.permissions.length > 0
    ? user.permissions
    : (Array.isArray(user.roles) && user.roles.length > 0 ? getCombinedPermissionsForRoles(user.roles) : getDefaultRolePermissions(user.role || ''));

  if (userPerms.includes('*') || userPerms.includes(permission)) return true;

  const [reqCategory, reqAction] = permission.includes(':') ? permission.split(':') : [permission, 'view'];

  for (const granted of userPerms) {
    if (granted === '*') return true;
    if (granted === permission) return true;

    // Category wildcard: e.g. granted 'giving' or 'giving:*' matches 'giving:view', 'giving:create'
    if (granted === reqCategory || granted === `${reqCategory}:*`) {
      return true;
    }

    // Action wildcard e.g. '*:view'
    if (granted === `*:${reqAction}`) {
      return true;
    }

    // Giving sub-categories mapped to financial permissions
    const givingCategories = ['tithes', 'offerings', 'donations', 'special_giving', 'building_fund', 'missions', 'welfare'];
    if (reqCategory === 'giving' && givingCategories.includes(granted.split(':')[0])) {
      return true;
    }
    if (givingCategories.includes(reqCategory) && (granted === 'giving' || granted === 'giving:*' || granted === 'finances')) {
      return true;
    }
    if (reqCategory === 'financial_reports' && (granted === 'giving' || granted === 'finances' || granted === 'expenses')) {
      return true;
    }
  }

  // Alias mapping
  const aliasMap: Record<string, string[]> = {
    view_dashboard: ['dashboard', 'dashboard:view'],
    dashboard: ['view_dashboard', 'dashboard:view'],
    manage_members: ['members', 'members:edit', 'members:create'],
    members: ['manage_members', 'members:view'],
    manage_attendance: ['attendance', 'attendance:edit', 'attendance:create'],
    attendance: ['manage_attendance', 'attendance:view'],
    send_sms: ['sms', 'sms:send'],
    sms: ['send_sms', 'sms:view'],
    manage_giving: ['giving', 'giving:create', 'giving:edit'],
    giving: ['manage_giving', 'giving:view', 'tithes', 'offerings'],
    manage_visitors: ['visitors', 'members:view'],
    visitors: ['manage_visitors', 'members:view'],
    manage_pastoral: ['pastoral', 'pastoral:create', 'pastoral:edit'],
    pastoral: ['manage_pastoral', 'pastoral:view'],
    manage_departments: ['departments', 'departments:edit'],
    departments: ['manage_departments', 'departments:view'],
    manage_events: ['events', 'events:create', 'events:edit'],
    events: ['manage_events', 'events:view'],
    manage_tasks: ['tasks', 'tasks:edit'],
    tasks: ['manage_tasks', 'tasks:view'],
    manage_staff: ['staff', 'staff:edit', 'staff:create'],
    staff: ['manage_staff', 'staff:view'],
    manage_settings: ['settings', 'settings:edit'],
    settings: ['manage_settings', 'settings:view'],
    view_reports: ['reports', 'reports:view', 'financial_reports:view'],
    reports: ['view_reports', 'reports:view'],
    audit_logs: ['audit_logs:view', 'staff'],
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

export type GivingCategoryType =
  | 'Tithes'
  | 'Offerings'
  | 'Donations'
  | 'Special Giving'
  | 'Building Fund'
  | 'Missions'
  | 'Welfare'
  | 'Other Giving';

export const GIVING_CATEGORIES: GivingCategoryType[] = [
  'Tithes',
  'Offerings',
  'Donations',
  'Special Giving',
  'Building Fund',
  'Missions',
  'Welfare',
  'Other Giving',
];

export interface GivingRecord {
  id: string;
  churchId: string;
  memberId?: string;
  memberName: string;
  phone?: string;
  amount: number;
  currency: string;
  givingCategory: GivingCategoryType | string;
  category: GivingCategoryType | string;
  givingType: string;
  date: string;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque' | 'POS Card' | string;
  referenceNumber: string;
  campaignOrProject?: string;
  receiptNumber: string;
  notes?: string;
  smsSent: boolean;
  smsMessageId?: string;
  recordedBy: string;
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

