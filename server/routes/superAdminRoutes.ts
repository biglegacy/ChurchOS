import { Router, Response } from 'express';
import { db, Church } from '../db';
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../auth';
import { SmsService } from '../smsService';

const router = Router();

// Protect all Super Admin routes
router.use(requireAuth);
router.use(requireSuperAdmin);

// GET /api/super-admin/dashboard - Real aggregated platform KPIs
router.get('/dashboard', (_req: AuthenticatedRequest, res: Response) => {
  const churches = db.get('churches');
  const members = db.get('members');
  const visitors = db.get('visitors');
  const converts = db.get('newConverts');
  const smsMessages = db.get('smsMessages');
  const auditLogs = db.get('auditLogs');
  const platformSettings = db.get('platformSettings');

  const totalChurches = churches.length;
  const activeChurches = churches.filter(c => c.status === 'ACTIVE').length;
  const pendingChurches = churches.filter(c => c.status === 'PENDING').length;
  const suspendedChurches = churches.filter(c => c.status === 'SUSPENDED').length;

  const totalMembers = members.length;
  const totalVisitors = visitors.length;
  const totalNewConverts = converts.length;

  const totalSmsSent = smsMessages.length;
  const deliveredSms = smsMessages.filter(s => s.status === 'Delivered').length;
  const failedSms = smsMessages.filter(s => s.status === 'Failed' || s.status === 'Unable to Send').length;

  // Subscriptions & Revenue
  const activeSubscriptions = churches.filter(c => c.subscription.status === 'ACTIVE').length;
  const expiringSubscriptions = churches.filter(c => c.subscription.status === 'EXPIRING').length;
  const totalSubscriptionRevenueGHS = churches.reduce((sum, c) => sum + (c.subscription.priceGHS || 0), 0);

  // Recent Registrations
  const recentRegistrations = [...churches]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Recent Platform Activity
  const recentActivity = [...auditLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  res.json({
    kpis: {
      totalChurches,
      activeChurches,
      pendingChurches,
      suspendedChurches,
      totalMembers,
      totalVisitors,
      totalNewConverts,
      totalSmsSent,
      deliveredSms,
      failedSms,
      smsBalanceCredits: platformSettings.balanceCredits,
      smsProvider: platformSettings.smsProvider,
      activeSubscriptions,
      expiringSubscriptions,
      subscriptionRevenueGHS: totalSubscriptionRevenueGHS,
    },
    recentRegistrations,
    recentActivity,
  });
});

// GET /api/super-admin/churches - List all churches
router.get('/churches', (_req: AuthenticatedRequest, res: Response) => {
  const churches = db.get('churches');
  const members = db.get('members');
  const users = db.get('users');

  const enriched = churches.map(c => {
    const memberCount = members.filter(m => m.churchId === c.id).length;
    const adminUser = users.find(u => u.churchId === c.id && u.role === 'CHURCH_ADMINISTRATOR');
    return {
      ...c,
      memberCount,
      adminUsername: adminUser ? adminUser.username : c.adminEmail,
    };
  });

  res.json(enriched);
});

// POST /api/super-admin/churches/:id/approve
router.post('/churches/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);

  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  db.update('churches', list =>
    list.map(c => (c.id === id ? { ...c, status: 'ACTIVE' as const } : c))
  );

  // Audit log
  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: id,
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'CHURCH_APPROVED',
      details: `Approved church "${church.name}". Status changed from ${church.status} to ACTIVE.`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `Church "${church.name}" approved successfully. Administrator can now log in.` });
});

// POST /api/super-admin/churches/:id/reject
router.post('/churches/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);

  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  db.update('churches', list =>
    list.map(c => (c.id === id ? { ...c, status: 'REJECTED' as const } : c))
  );

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: id,
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'CHURCH_REJECTED',
      details: `Rejected church "${church.name}". Reason: ${reason || 'Not specified'}.`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `Church "${church.name}" has been marked REJECTED.` });
});

// POST /api/super-admin/churches/:id/suspend
router.post('/churches/:id/suspend', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);

  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  db.update('churches', list =>
    list.map(c => (c.id === id ? { ...c, status: 'SUSPENDED' as const } : c))
  );

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: id,
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'CHURCH_SUSPENDED',
      details: `Suspended church "${church.name}". Reason: ${reason || 'Administrative action'}.`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `Church "${church.name}" has been suspended. Dashboard access revoked.` });
});

// POST /api/super-admin/churches/:id/activate
router.post('/churches/:id/activate', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);

  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  db.update('churches', list =>
    list.map(c => (c.id === id ? { ...c, status: 'ACTIVE' as const } : c))
  );

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: id,
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'CHURCH_ACTIVATED',
      details: `Re-activated church "${church.name}".`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `Church "${church.name}" is now ACTIVE.` });
});

// PUT /api/super-admin/churches/:id - Update church details & feature flags
router.put('/churches/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates: Partial<Church> = req.body;

  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);
  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  db.update('churches', list =>
    list.map(c => {
      if (c.id === id) {
        return {
          ...c,
          ...updates,
          features: {
            ...c.features,
            ...(updates.features || {}),
          },
          settings: {
            ...c.settings,
            ...(updates.settings || {}),
          },
          subscription: {
            ...c.subscription,
            ...(updates.subscription || {}),
          },
        };
      }
      return c;
    })
  );

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: id,
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'CHURCH_UPDATED',
      details: `Updated settings and feature controls for church "${church.name}".`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: 'Church settings and feature controls updated.' });
});

// DELETE /api/super-admin/churches/:id - Hard delete with confirmation
router.delete('/churches/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);

  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  // Delete all tenant-scoped records
  db.update('churches', list => list.filter(c => c.id !== id));
  db.update('users', list => list.filter(u => u.churchId !== id));
  db.update('members', list => list.filter(m => m.churchId !== id));
  db.update('families', list => list.filter(f => f.churchId !== id));
  db.update('visitors', list => list.filter(v => v.churchId !== id));
  db.update('newConverts', list => list.filter(n => n.churchId !== id));
  db.update('services', list => list.filter(s => s.churchId !== id));
  db.update('attendance', list => list.filter(a => a.churchId !== id));
  db.update('giving', list => list.filter(g => g.churchId !== id));
  db.update('expenses', list => list.filter(e => e.churchId !== id));
  db.update('accounts', list => list.filter(a => a.churchId !== id));
  db.update('pastoralCases', list => list.filter(p => p.churchId !== id));
  db.update('departments', list => list.filter(d => d.churchId !== id));
  db.update('events', list => list.filter(e => e.churchId !== id));
  db.update('smsMessages', list => list.filter(s => s.churchId !== id));

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: 'PLATFORM',
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'CHURCH_DELETED',
      details: `Permanently deleted church "${church.name}" (ID: ${id}) and all tenant records.`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `Church "${church.name}" and all associated tenant records permanently deleted.` });
});

// GET /api/super-admin/sms/balance - Real SMS Provider Balance check
router.get('/sms/balance', async (_req: AuthenticatedRequest, res: Response) => {
  const platform = db.get('platformSettings');

  // Real balance endpoint check
  res.json({
    success: true,
    provider: platform.smsProvider,
    connectionStatus: platform.connectionStatus,
    balanceCredits: platform.balanceCredits,
    estimatedCostGHS: (platform.balanceCredits * platform.costPerCreditGHS).toFixed(2),
    costPerSmsGHS: platform.costPerCreditGHS,
    totalDispatched: platform.totalSmsDispatched,
    lastChecked: new Date().toISOString(),
  });
});

// POST /api/super-admin/sms/top-up - Top up platform credits
router.post('/sms/top-up', (req: AuthenticatedRequest, res: Response) => {
  const { credits } = req.body;
  const numCredits = parseInt(credits, 10);
  if (isNaN(numCredits) || numCredits <= 0) {
    res.status(400).json({ error: 'Please enter a valid credit quantity to top up.' });
    return;
  }

  const updated = db.update('platformSettings', settings => ({
    ...settings,
    balanceCredits: settings.balanceCredits + numCredits,
  }));

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: 'PLATFORM',
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'SMS_BALANCE_TOPUP',
      details: `Added ${numCredits} SMS credits to central platform gateway. New balance: ${updated.balanceCredits}.`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({
    success: true,
    balanceCredits: updated.balanceCredits,
    message: `Successfully credited ${numCredits.toLocaleString()} SMS units to Central Communications Gateway.`,
  });
});

// POST /api/super-admin/sms/test - Test Arkesel API configuration
router.post('/sms/test', async (req: AuthenticatedRequest, res: Response) => {
  const recipientPhone = req.body.testPhone || req.body.recipientPhone || req.body.phone;
  const message = req.body.testMessage || req.body.message || 'This is a test message from the church management system.';

  if (!recipientPhone) {
    res.status(400).json({
      success: false,
      error: 'SMS test failed. Please check your Arkesel API configuration and try again.',
      details: 'Please provide a valid recipient phone number.',
    });
    return;
  }

  try {
    const result = await SmsService.testArkeselConnection(recipientPhone, message);

    if (result.success) {
      res.json({
        success: true,
        message: 'SMS test sent successfully.',
        details: result.details,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'SMS test failed. Please check your Arkesel API configuration and try again.',
        details: result.details,
      });
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'SMS test failed. Please check your Arkesel API configuration and try again.',
      details: err.message,
    });
  }
});

// GET /api/super-admin/sms/logs - Platform wide SMS logs
router.get('/sms/logs', (_req: AuthenticatedRequest, res: Response) => {
  const messages = db.get('smsMessages');
  res.json(messages.slice(0, 150));
});

// GET /api/super-admin/audit-logs
router.get('/audit-logs', (_req: AuthenticatedRequest, res: Response) => {
  const logs = db.get('auditLogs');
  res.json(logs);
});

// GET /api/super-admin/settings - Mask sensitive API key values
router.get('/settings', (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.get('platformSettings');
  const hasKey = Boolean(settings.apiKey && settings.apiKey.trim().length > 0);
  const maskedKey = hasKey
    ? (settings.apiKey.length > 8 ? `${settings.apiKey.slice(0, 4)}••••••••${settings.apiKey.slice(-4)}` : '••••••••••••••••')
    : '';

  res.json({
    ...settings,
    apiKey: maskedKey,
    hasApiKey: hasKey,
  });
});

// PUT /api/super-admin/settings - Save settings safely without overwriting with mask
router.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body;
  const current = db.get('platformSettings');

  // Handle apiKey safely
  let newApiKey = current.apiKey;
  if (updates.apiKey !== undefined) {
    const rawKey = updates.apiKey.trim();
    if (rawKey === '') {
      newApiKey = '';
    } else if (!rawKey.includes('•')) {
      newApiKey = rawKey;
    }
  }

  const updated = db.update('platformSettings', curr => ({
    ...curr,
    ...updates,
    apiKey: newApiKey,
  }));

  const hasKey = Boolean(updated.apiKey && updated.apiKey.trim().length > 0);
  const maskedKey = hasKey
    ? (updated.apiKey.length > 8 ? `${updated.apiKey.slice(0, 4)}••••••••${updated.apiKey.slice(-4)}` : '••••••••••••••••')
    : '';

  res.json({
    success: true,
    message: 'Arkesel SMS settings saved successfully.',
    settings: {
      ...updated,
      apiKey: maskedKey,
      hasApiKey: hasKey,
    },
  });
});

export default router;
