import { Router, Response } from 'express';
import { db, Church, User, hashPassword, PricingPlan, PopupMessage, SystemNotification } from '../db';
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
router.put('/churches/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates: Partial<Church> = req.body;

  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);
  if (!church) {
    res.status(404).json({ error: 'Church not found in Firebase' });
    return;
  }

  const updatedChurch: Church = {
    ...church,
    ...updates,
    features: {
      ...church.features,
      ...(updates.features || {}),
    },
    settings: {
      ...church.settings,
      ...(updates.settings || {}),
    },
    subscription: {
      ...church.subscription,
      ...(updates.subscription || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  // Directly persist church update to Firebase Firestore
  await db.saveDoc('churches', id, updatedChurch);

  // If administrator details were updated, synchronize corresponding admin user in Firebase
  const users = db.get('users');
  const adminUser = users.find(u => u.churchId === id && u.role === 'CHURCH_ADMINISTRATOR');
  if (adminUser) {
    const updatedAdmin: User = {
      ...adminUser,
      fullName: updates.adminName || adminUser.fullName,
      email: updates.adminEmail || adminUser.email,
      username: updates.adminEmail || adminUser.username,
      phone: updates.adminPhone || adminUser.phone,
    };
    await db.saveDoc('users', adminUser.id, updatedAdmin);
  }

  // Audit log directly in Firebase
  const auditEntry = {
    id: `aud_${Date.now()}`,
    churchId: id,
    userId: req.user?.id || 'su@admin',
    userName: req.user?.fullName || 'Super Admin',
    action: 'CHURCH_UPDATED',
    details: `Super Admin updated church details for "${updatedChurch.name}" in Firebase.`,
    timestamp: new Date().toISOString(),
  };
  await db.saveDoc('auditLogs', auditEntry.id, auditEntry);

  res.json({
    success: true,
    church: updatedChurch,
    message: `Church "${updatedChurch.name}" updated successfully in Firebase.`,
  });
});

// DELETE /api/super-admin/churches/:id - Hard delete from Firebase with permanent purge
router.delete('/churches/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const churches = db.get('churches');
  const church = churches.find(c => c.id === id);

  if (!church) {
    res.status(404).json({ error: 'Church not found in Firebase' });
    return;
  }

  // Permanently delete church and cascade delete all tenant-scoped records from Firebase
  await db.permanentlyDeleteChurch(id);

  // Record audit log in Firebase
  const auditEntry = {
    id: `aud_${Date.now()}`,
    churchId: 'PLATFORM',
    userId: req.user?.id || 'su@admin',
    userName: req.user?.fullName || 'Super Admin',
    action: 'CHURCH_DELETED',
    details: `Permanently deleted church "${church.name}" (ID: ${id}) and all tenant records from Firebase.`,
    timestamp: new Date().toISOString(),
  };
  await db.saveDoc('auditLogs', auditEntry.id, auditEntry);

  res.json({
    success: true,
    message: `Church "${church.name}" and all associated records have been permanently deleted from Firebase.`,
  });
});

// GET /api/super-admin/sms/balance - Real SMS Provider Balance check
router.get('/sms/balance', async (_req: AuthenticatedRequest, res: Response) => {
  const platform = db.get('platformSettings');

  // Verify and fetch live balance from Arkesel if API key is present
  if (platform.apiKey && platform.apiKey.trim().length > 0) {
    try {
      await SmsService.checkGatewayBalance();
    } catch {
      // Continue with current database settings
    }
  }

  const updated = db.get('platformSettings');
  res.json({
    success: true,
    provider: updated.smsProvider,
    connectionStatus: updated.connectionStatus,
    balanceCredits: updated.balanceCredits,
    estimatedCostGHS: (updated.balanceCredits * updated.costPerCreditGHS).toFixed(2),
    costPerSmsGHS: updated.costPerCreditGHS,
    totalDispatched: updated.totalSmsDispatched,
    lastChecked: new Date().toISOString(),
  });
});

// POST /api/super-admin/sms/verify - Verify Arkesel API connection without sending SMS
router.post('/sms/verify', async (_req: AuthenticatedRequest, res: Response) => {
  const result = await SmsService.checkGatewayBalance();
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json({
      success: false,
      error: result.message,
      details: result.details,
    });
  }
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

  if (!recipientPhone || !recipientPhone.trim()) {
    res.status(400).json({
      success: false,
      error: 'Please provide a valid recipient phone number (e.g. 0241234567 or +233241234567).',
      details: 'Recipient phone number is required.',
    });
    return;
  }

  try {
    const result = await SmsService.testArkeselConnection(recipientPhone.trim(), message);

    if (result.success) {
      res.json({
        success: true,
        message: 'SMS test sent successfully.',
        details: result.details,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message || 'SMS test failed. Please check your Arkesel API configuration and try again.',
        details: result.details || result.message,
      });
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'SMS test failed. Please check your Arkesel API configuration and try again.',
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

  const hasKey = Boolean(newApiKey && newApiKey.trim().length > 0);
  const updated = db.update('platformSettings', curr => ({
    ...curr,
    ...updates,
    apiKey: newApiKey,
    hasApiKey: hasKey,
  }));

  // Verify connection with Arkesel asynchronously
  if (hasKey) {
    SmsService.checkGatewayBalance().catch(() => {});
  } else {
    db.update('platformSettings', s => ({ ...s, connectionStatus: 'Disconnected' }));
  }

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

// ================= USERS MANAGEMENT ================= //
router.get('/users', (_req: AuthenticatedRequest, res: Response) => {
  const users = db.get('users');
  const churches = db.get('churches');

  const enriched = users.map(u => {
    const church = churches.find(c => c.id === u.churchId);
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      churchId: u.churchId,
      churchName: church ? church.name : (u.role === 'SUPER_ADMIN' ? 'Platform HQ' : 'Unassigned'),
      phone: u.phone || '',
      createdAt: u.createdAt,
    };
  });

  res.json(enriched);
});

router.post('/users', (req: AuthenticatedRequest, res: Response) => {
  const { username, email, fullName, role, churchId, password, phone } = req.body;
  if (!username || !password || !fullName || !role) {
    res.status(400).json({ error: 'Username, password, full name, and role are required.' });
    return;
  }

  const users = db.get('users');
  const lowerUser = username.trim().toLowerCase();
  if (users.some(u => u.username.toLowerCase() === lowerUser || (email && u.email.toLowerCase() === email.trim().toLowerCase()))) {
    res.status(400).json({ error: 'A user with this username or email already exists.' });
    return;
  }

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    username: username.trim(),
    email: (email || username).trim().toLowerCase(),
    passwordHash: hashPassword(password),
    fullName: fullName.trim(),
    role,
    churchId: role === 'SUPER_ADMIN' ? undefined : churchId,
    phone: phone?.trim(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  db.update('users', list => [newUser, ...list]);

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: churchId || 'PLATFORM',
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'USER_CREATED',
      details: `Created new ${role} user: ${newUser.username} (${newUser.fullName})`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      status: newUser.status,
      churchId: newUser.churchId,
    },
    message: 'User created successfully.',
  });
});

router.put('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    res.status(400).json({ error: 'Invalid status value.' });
    return;
  }

  const users = db.get('users');
  const user = users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (user.role === 'SUPER_ADMIN' && user.id === req.user?.id && status !== 'ACTIVE') {
    res.status(400).json({ error: 'You cannot deactivate your own Super Admin account.' });
    return;
  }

  db.update('users', list =>
    list.map(u => (u.id === id ? { ...u, status } : u))
  );

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: user.churchId || 'PLATFORM',
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'USER_STATUS_CHANGE',
      details: `Changed user status of ${user.username} to ${status}.`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `User status changed to ${status}.` });
});

router.delete('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const users = db.get('users');
  const user = users.find(u => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (user.role === 'SUPER_ADMIN') {
    res.status(400).json({ error: 'Super Admin users cannot be deleted.' });
    return;
  }

  db.update('users', list => list.filter(u => u.id !== id));

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: user.churchId || 'PLATFORM',
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'USER_DELETED',
      details: `Deleted user ${user.username} (${user.fullName}).`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `User ${user.username} deleted successfully.` });
});

// ================= SUBSCRIPTIONS ================= //
router.get('/subscriptions', (_req: AuthenticatedRequest, res: Response) => {
  const churches = db.get('churches');
  const plans = db.get('pricingPlans') || [];

  const items = churches.map(c => ({
    churchId: c.id,
    churchName: c.name,
    adminEmail: c.adminEmail,
    adminPhone: c.adminPhone,
    status: c.status,
    subscription: c.subscription,
    createdAt: c.createdAt,
  }));

  const activeCount = churches.filter(c => c.subscription?.status === 'ACTIVE').length;
  const expiringCount = churches.filter(c => c.subscription?.status === 'EXPIRING').length;
  const expiredCount = churches.filter(c => c.subscription?.status === 'EXPIRED').length;
  const totalRevenueGHS = churches.reduce((sum, c) => sum + (c.subscription?.priceGHS || 0), 0);

  res.json({
    subscriptions: items,
    plans,
    metrics: {
      totalChurches: churches.length,
      activeCount,
      expiringCount,
      expiredCount,
      totalRevenueGHS,
    },
  });
});

router.put('/subscriptions/:churchId', (req: AuthenticatedRequest, res: Response) => {
  const { churchId } = req.params;
  const { plan, status, expiresAt, priceGHS } = req.body;

  const churches = db.get('churches');
  const church = churches.find(c => c.id === churchId);

  if (!church) {
    res.status(404).json({ error: 'Church not found.' });
    return;
  }

  db.update('churches', list =>
    list.map(c => {
      if (c.id === churchId) {
        return {
          ...c,
          subscription: {
            ...c.subscription,
            plan: plan || c.subscription.plan,
            status: status || c.subscription.status,
            expiresAt: expiresAt || c.subscription.expiresAt,
            priceGHS: priceGHS !== undefined ? Number(priceGHS) : c.subscription.priceGHS,
          },
        };
      }
      return c;
    })
  );

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId,
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'SUBSCRIPTION_UPDATED',
      details: `Updated subscription for "${church.name}": Plan ${plan || church.subscription.plan}, Status ${status || church.subscription.status}`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: `Subscription updated for ${church.name}.` });
});

// ================= PRICING MANAGEMENT ================= //
router.get('/pricing', (_req: AuthenticatedRequest, res: Response) => {
  const plans = db.get('pricingPlans') || [];
  res.json(plans);
});

router.post('/pricing', (req: AuthenticatedRequest, res: Response) => {
  const { name, code, priceMonthlyGHS, priceAnnualGHS, maxMembers, monthlySmsCredits, features } = req.body;
  if (!name || !code || priceMonthlyGHS === undefined) {
    res.status(400).json({ error: 'Name, code, and monthly price are required.' });
    return;
  }

  const newPlan: PricingPlan = {
    id: `plan_${Date.now()}`,
    name,
    code: code.toLowerCase().replace(/\s+/g, '_'),
    priceMonthlyGHS: Number(priceMonthlyGHS),
    priceAnnualGHS: Number(priceAnnualGHS || Number(priceMonthlyGHS) * 10),
    maxMembers: Number(maxMembers || 500),
    monthlySmsCredits: Number(monthlySmsCredits || 500),
    features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split(',').map(f => f.trim()).filter(Boolean) : []),
    status: 'ACTIVE',
  };

  db.update('pricingPlans', list => [...(list || []), newPlan]);
  res.status(201).json({ success: true, plan: newPlan, message: 'Pricing plan created.' });
});

router.put('/pricing/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  db.update('pricingPlans', list =>
    (list || []).map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          priceMonthlyGHS: updates.priceMonthlyGHS !== undefined ? Number(updates.priceMonthlyGHS) : p.priceMonthlyGHS,
          priceAnnualGHS: updates.priceAnnualGHS !== undefined ? Number(updates.priceAnnualGHS) : p.priceAnnualGHS,
          maxMembers: updates.maxMembers !== undefined ? Number(updates.maxMembers) : p.maxMembers,
          monthlySmsCredits: updates.monthlySmsCredits !== undefined ? Number(updates.monthlySmsCredits) : p.monthlySmsCredits,
          features: Array.isArray(updates.features) ? updates.features : p.features,
        };
      }
      return p;
    })
  );

  res.json({ success: true, message: 'Pricing plan updated.' });
});

// ================= POPUP MESSAGES ================= //
router.get('/popup-messages', (_req: AuthenticatedRequest, res: Response) => {
  const popups = db.get('popupMessages') || [];
  res.json(popups);
});

router.post('/popup-messages', (req: AuthenticatedRequest, res: Response) => {
  const { title, message, type, targetAudience, expiresAt } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required.' });
    return;
  }

  const newPopup: PopupMessage = {
    id: `pop_${Date.now()}`,
    title: title.trim(),
    message: message.trim(),
    type: type || 'INFO',
    targetAudience: targetAudience || 'ALL',
    active: true,
    expiresAt,
    createdAt: new Date().toISOString(),
    createdBy: req.user?.fullName || 'Super Admin',
  };

  db.update('popupMessages', list => [newPopup, ...(list || [])]);

  res.status(201).json({ success: true, popup: newPopup, message: 'Popup message broadcast created.' });
});

router.put('/popup-messages/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  let newStatus = false;
  db.update('popupMessages', list =>
    (list || []).map(p => {
      if (p.id === id) {
        newStatus = !p.active;
        return { ...p, active: newStatus };
      }
      return p;
    })
  );

  res.json({ success: true, active: newStatus, message: `Popup message is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.` });
});

router.delete('/popup-messages/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  db.update('popupMessages', list => (list || []).filter(p => p.id !== id));
  res.json({ success: true, message: 'Popup message deleted.' });
});

// ================= NOTIFICATIONS ================= //
router.get('/notifications', (_req: AuthenticatedRequest, res: Response) => {
  const notifs = db.get('systemNotifications') || [];
  res.json(notifs);
});

router.post('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const { title, message, severity, category } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required.' });
    return;
  }

  const newNotif: SystemNotification = {
    id: `notif_${Date.now()}`,
    title: title.trim(),
    message: message.trim(),
    severity: severity || 'low',
    category: category || 'SYSTEM',
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  db.update('systemNotifications', list => [newNotif, ...(list || [])]);
  res.status(201).json({ success: true, notification: newNotif, message: 'System alert notification created.' });
});

router.put('/notifications/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  db.update('systemNotifications', list =>
    (list || []).map(n => (n.id === id ? { ...n, isRead: true } : n))
  );
  res.json({ success: true });
});

// ================= API SETTINGS ================= //
router.get('/api-settings', (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.get('platformSettings');
  res.json({
    apiEndpoint: settings.apiEndpoint,
    smsProvider: settings.smsProvider,
    defaultSenderId: settings.defaultSenderId,
    connectionStatus: settings.connectionStatus,
    webhookUrl: 'https://ais-dev-v5vseiddljyuoccmnf2uvj-444415977811.europe-west3.run.app/api/webhooks/arkesel',
    rateLimitPerMinute: 120,
    timeoutSeconds: 15,
    retryAttempts: 3,
    corsOrigin: '*',
    lastUpdated: new Date().toISOString(),
  });
});

router.put('/api-settings', (req: AuthenticatedRequest, res: Response) => {
  const { apiEndpoint, defaultSenderId, smsProvider } = req.body;

  const updated = db.update('platformSettings', curr => ({
    ...curr,
    apiEndpoint: apiEndpoint || curr.apiEndpoint,
    defaultSenderId: defaultSenderId || curr.defaultSenderId,
    smsProvider: smsProvider || curr.smsProvider,
  }));

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId: 'PLATFORM',
      userId: req.user?.id || 'su@admin',
      userName: req.user?.fullName || 'Super Admin',
      action: 'API_SETTINGS_UPDATED',
      details: `Updated Central API settings: Endpoint ${updated.apiEndpoint}, Sender ID: ${updated.defaultSenderId}`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: 'Central API configuration saved successfully.' });
});

// ================= SMS DELIVERY MONITORING & STATS (SUPER ADMIN ONLY) ================= //
router.get('/sms/stats', (_req: AuthenticatedRequest, res: Response) => {
  const messages = db.get('smsMessages');
  const platform = db.get('platformSettings');

  const total = messages.length;
  const delivered = messages.filter(m => m.status === 'Delivered').length;
  const accepted = messages.filter(m => m.status === 'Accepted' || m.status === 'Submitted').length;
  const queued = messages.filter(m => m.status === 'Queued' || m.status === 'Sending').length;
  const failed = messages.filter(m => m.status === 'Failed' || m.status === 'Unable to Send').length;

  const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '100.0';
  const acceptanceRate = total > 0 ? (((delivered + accepted) / total) * 100).toFixed(1) : '100.0';

  // Telecom Carrier breakdown (estimated by Ghana network prefixes)
  const carrierStats = {
    mtn: messages.filter(m => /^(233)?(0)?(24|54|55|59)/.test(m.normalizedPhone || m.phone)).length,
    telecel: messages.filter(m => /^(233)?(0)?(20|50)/.test(m.normalizedPhone || m.phone)).length,
    at: messages.filter(m => /^(233)?(0)?(26|27|56|57)/.test(m.normalizedPhone || m.phone)).length,
    other: 0,
  };
  carrierStats.other = Math.max(0, total - (carrierStats.mtn + carrierStats.telecel + carrierStats.at));

  res.json({
    totalDispatched: total,
    delivered,
    accepted,
    queued,
    failed,
    deliveryRatePercent: parseFloat(deliveryRate),
    acceptanceRatePercent: parseFloat(acceptanceRate),
    balanceCredits: platform.balanceCredits,
    carrierStats,
    recentFailures: messages.filter(m => m.status === 'Failed' || m.status === 'Unable to Send').slice(0, 10),
  });
});

export default router;
