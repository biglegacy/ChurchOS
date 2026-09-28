import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User, Church, getDefaultRolePermissions, getPredefinedRolePermissions, CustomRole } from './db';

const JWT_SECRET = process.env.APP_SECRET || 'church_os_secret_key_prod_2026';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: User['role'];
  churchId?: string;
  exp: number;
}

export function createToken(user: User): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    churchId: user.churchId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
    if (signature !== expectedSignature) return null;

    const payload: AuthTokenPayload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  church?: Church;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  const users = db.get('users');
  const user = users.find(u => u.id === payload.userId);
  if (!user || user.status === 'SUSPENDED') {
    res.status(403).json({ error: 'User account is inactive or suspended.' });
    return;
  }

  req.user = user;

  // If user belongs to a church, verify the church status
  if (user.churchId) {
    const churches = db.get('churches');
    const church = churches.find(c => c.id === user.churchId);
    if (!church) {
      res.status(404).json({ error: 'Associated church not found.' });
      return;
    }

    if (church.status === 'PENDING') {
      res.status(403).json({
        code: 'CHURCH_PENDING',
        error: 'Your church registration is pending Super Admin review. You will gain access once approved.',
      });
      return;
    }

    if (church.status === 'SUSPENDED') {
      res.status(403).json({
        code: 'CHURCH_SUSPENDED',
        error: 'This church account has been suspended by the platform administrator. Please contact support.',
      });
      return;
    }

    if (church.status === 'REJECTED') {
      res.status(403).json({
        code: 'CHURCH_REJECTED',
        error: 'This church registration was rejected. Please contact support for assistance.',
      });
      return;
    }

    req.church = church;
  }

  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Access denied. Super Administrator privilege required.' });
    return;
  }
  next();
}

export function enforceTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Super Admin can inspect any church if explicitly requested
  if (req.user?.role === 'SUPER_ADMIN') {
    const targetChurchId = (req.params.churchId || req.query.churchId || req.body?.churchId) as string;
    if (targetChurchId) {
      const churches = db.get('churches');
      const targetChurch = churches.find(c => c.id === targetChurchId);
      if (targetChurch) {
        req.church = targetChurch;
      }
    }
    next();
    return;
  }

  if (!req.user?.churchId) {
    res.status(403).json({ error: 'User does not belong to any church organization.' });
    return;
  }

  // Ensure request is scoped strictly to user's church
  const requestedChurchId = (req.params.churchId || req.query.churchId || req.body?.churchId) as string;
  if (requestedChurchId && requestedChurchId !== req.user.churchId) {
    res.status(403).json({ error: 'Tenant isolation violation: Cross-tenant access is strictly forbidden.' });
    return;
  }

  next();
}

export function getUserPermissions(user: User, churchId?: string): string[] {
  if (user.role === 'SUPER_ADMIN') return ['*'];
  if (user.role === 'CHURCH_OWNER') return ['*'];
  if (user.role === 'CHURCH_ADMINISTRATOR' && !user.isAssignedRole && !user.accountType) {
    return ['*'];
  }

  const effectiveChurchId = churchId || user.churchId;
  const combined = new Set<string>();

  // Determine all active roles assigned to this staff member
  const rawRoles: string[] = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles
    : (user.role ? user.role.split(',').map(s => s.trim()).filter(Boolean) : []);

  // Fetch church custom roles for resolution (strictly tenant isolated)
  const churchCustomRoles: CustomRole[] = effectiveChurchId
    ? (db.get('customRoles') || []).filter(cr => cr.churchId === effectiveChurchId)
    : [];

  for (const roleItem of rawRoles) {
    // 1. Check predefined roles
    const predefinedPerms = getPredefinedRolePermissions(roleItem);
    if (predefinedPerms.length > 0) {
      for (const p of predefinedPerms) combined.add(p);
    }

    // 2. Check church-isolated custom roles (match by ID or Name)
    const matchedCustom = churchCustomRoles.find(
      cr => cr.id === roleItem || cr.name.toLowerCase() === roleItem.toLowerCase()
    );
    if (matchedCustom && Array.isArray(matchedCustom.permissions)) {
      for (const p of matchedCustom.permissions) combined.add(p);
    }
  }

  // 3. Include any direct explicit permissions assigned to user
  if (Array.isArray(user.permissions)) {
    for (const p of user.permissions) combined.add(p);
  }

  // If no roles or permissions resolved, return empty list (Strict zero-trust default deny)
  return Array.from(combined);
}

export function hasPermission(user: User, permission: string, churchId?: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'CHURCH_OWNER') return true;
  if (user.role === 'CHURCH_ADMINISTRATOR' && !user.isAssignedRole && !user.accountType) return true;

  const perms = getUserPermissions(user, churchId);
  if (perms.includes('*') || perms.includes(permission)) return true;

  // 1. If permission has an action syntax (e.g. "members:view", "tithes:create", "expenses:approve")
  if (permission.includes(':')) {
    const [category, action] = permission.split(':');

    // Universal category wildcards
    if (perms.includes(`${category}:*`) || perms.includes(`manage_${category}`)) {
      return true;
    }

    // Broad module grant
    if (perms.includes(category)) {
      return true;
    }

    // Giving sub-categories delegation
    const givingSubCategories = [
      'tithes', 'offerings', 'donations', 'special_giving', 'building_fund', 'missions', 'welfare'
    ];
    if (givingSubCategories.includes(category)) {
      if (perms.includes(`giving:${action}`) || perms.includes('giving:*') || perms.includes('giving') || perms.includes('manage_giving')) {
        return true;
      }
    }

    // Check specific action match
    if (perms.includes(permission)) {
      return true;
    }

    return false;
  }

  // 2. If permission is a module/category name (e.g. "members", "giving", "expenses", "attendance", "sms")
  // Check if user has ANY permission in that category to view the module
  if (permission === 'giving') {
    const givingCategories = ['tithes', 'offerings', 'donations', 'special_giving', 'building_fund', 'missions', 'welfare', 'giving', 'finances'];
    return perms.some(p =>
      givingCategories.some(cat => p === cat || p.startsWith(`${cat}:`) || p === `manage_${cat}`) ||
      p === 'manage_giving' ||
      p === 'finances'
    );
  }

  if (permission === 'visitors') {
    return perms.some(p => p.startsWith('visitors:') || p.startsWith('evangelism:') || p === 'visitors' || p === 'manage_visitors');
  }

  if (permission === 'pastoral') {
    return perms.some(p => p.startsWith('pastoral:') || p.startsWith('welfare:') || p === 'pastoral' || p === 'manage_pastoral');
  }

  // General category check: does user hold any action under this category?
  const hasCategoryAction = perms.some(p =>
    p === permission ||
    p.startsWith(`${permission}:`) ||
    p === `manage_${permission}` ||
    p === `view_${permission}`
  );
  if (hasCategoryAction) return true;

  // Handle legacy alias mappings
  const aliasMap: Record<string, string[]> = {
    view_dashboard: ['dashboard', 'dashboard:view'],
    dashboard: ['view_dashboard', 'dashboard:view'],
    manage_members: ['members', 'members:view', 'members:create', 'members:edit'],
    members: ['manage_members', 'members:view'],
    manage_attendance: ['attendance', 'attendance:view', 'attendance:create'],
    attendance: ['manage_attendance', 'attendance:view'],
    send_sms: ['sms', 'sms:send', 'sms:view'],
    sms: ['send_sms', 'sms:send', 'sms:view'],
    manage_giving: ['giving', 'finances', 'tithes:view', 'offerings:view'],
    finances: ['giving', 'manage_giving', 'tithes:view'],
    expenses: ['manage_giving', 'expenses:view', 'expenses:create'],
    manage_visitors: ['visitors', 'visitors:view'],
    visitors: ['manage_visitors', 'visitors:view'],
    manage_pastoral: ['pastoral', 'pastoral:view'],
    pastoral: ['manage_pastoral', 'pastoral:view'],
    manage_departments: ['departments', 'departments:view'],
    departments: ['manage_departments', 'departments:view'],
    manage_events: ['events', 'events:view'],
    events: ['manage_events', 'events:view'],
    manage_tasks: ['tasks', 'tasks:view'],
    tasks: ['manage_tasks', 'tasks:view'],
    manage_staff: ['staff', 'staff:view'],
    staff: ['manage_staff', 'staff:view'],
    manage_settings: ['settings', 'settings:view'],
    settings: ['manage_settings', 'settings:view'],
    view_reports: ['reports', 'reports:view', 'financial_reports:view'],
    reports: ['view_reports', 'reports:view', 'financial_reports:view'],
  };

  const aliases = aliasMap[permission] || [];
  return aliases.some(alias => perms.includes(alias));
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    if (req.user.status === 'SUSPENDED' || req.user.status === 'INACTIVE') {
      res.status(403).json({ error: 'Staff account has been disabled or suspended. Contact your church administrator.' });
      return;
    }

    const churchId = req.user.churchId || req.church?.id;
    if (!hasPermission(req.user, permission, churchId)) {
      const activeRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
      res.status(403).json({
        error: `Access denied. Your assigned role(s) [${activeRoles.join(', ')}] do not have permission "${permission}".`,
        requiredPermission: permission,
        assignedRoles: activeRoles,
      });
      return;
    }

    next();
  };
}
