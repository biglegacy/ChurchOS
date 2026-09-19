import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, User, Church, getDefaultRolePermissions } from './db';

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

export function getUserPermissions(user: User): string[] {
  if (user.role === 'SUPER_ADMIN') return ['*'];
  if (user.role === 'CHURCH_OWNER' || user.role === 'CHURCH_ADMINISTRATOR' || user.role === 'ADMINISTRATOR') {
    return ['*'];
  }
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  return getDefaultRolePermissions(user.role);
}

export function hasPermission(user: User, permission: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'CHURCH_OWNER' || user.role === 'CHURCH_ADMINISTRATOR' || user.role === 'ADMINISTRATOR') return true;
  const perms = getUserPermissions(user);
  return perms.includes('*') || perms.includes(permission);
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }
    if (!hasPermission(req.user, permission)) {
      res.status(403).json({
        error: `Access denied. Your role (${req.user.customRoleTitle || req.user.role}) is not authorized to access the "${permission}" module.`,
        requiredPermission: permission,
      });
      return;
    }
    next();
  };
}
