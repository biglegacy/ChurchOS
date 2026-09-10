import { Router, Response } from 'express';
import { db, Member, Family, Visitor, NewConvert, ChurchService, AttendanceRecord, GivingRecord, ExpenseRecord, PastoralCase, DepartmentOrGroup, ChurchEvent } from '../db';
import { requireAuth, enforceTenant, AuthenticatedRequest } from '../auth';
import { SmsService, normalizePhoneNumber } from '../smsService';

const router = Router();

// Ensure all church routes require authentication and strictly enforce tenant isolation
router.use(requireAuth);
router.use(enforceTenant);

function getChurchId(req: AuthenticatedRequest): string {
  // If Super Admin has specified a churchId in query/params, use it; otherwise use authenticated user's churchId
  if (req.user?.role === 'SUPER_ADMIN') {
    return (req.query.churchId || req.params.churchId || req.church?.id || 'ch_grace_temple') as string;
  }
  return req.user?.churchId!;
}

// GET /api/church/dashboard - Real live church KPIs
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const churches = db.get('churches');
  const church = churches.find(c => c.id === churchId);

  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  const members = db.get('members').filter(m => m.churchId === churchId);
  const visitors = db.get('visitors').filter(v => v.churchId === churchId);
  const converts = db.get('newConverts').filter(c => c.churchId === churchId);
  const services = db.get('services').filter(s => s.churchId === churchId);
  const attendance = db.get('attendance').filter(a => a.churchId === churchId);
  const giving = db.get('giving').filter(g => g.churchId === churchId);
  const expenses = db.get('expenses').filter(e => e.churchId === churchId);
  const events = db.get('events').filter(e => e.churchId === churchId);
  const pastoral = db.get('pastoralCases').filter(p => p.churchId === churchId);
  const smsMessages = db.get('smsMessages').filter(s => s.churchId === churchId);

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.membershipStatus === 'Active').length;
  const totalVisitors = visitors.length;
  const totalNewConverts = converts.length;

  // Today's attendance
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendanceRecords = attendance.filter(a => a.serviceDate === todayStr);
  const todayAttendancePresent = todayAttendanceRecords.filter(a => a.status === 'Present').length;
  const todayAttendanceAbsent = todayAttendanceRecords.filter(a => a.status === 'Absent').length;

  // Monthly Attendance totals
  const currentMonthStr = todayStr.slice(0, 7);
  const monthlyAttendanceRecords = attendance.filter(a => a.serviceDate.startsWith(currentMonthStr));
  const monthlyAttendancePresent = monthlyAttendanceRecords.filter(a => a.status === 'Present').length;

  // Financial Breakdown
  const totalTithes = giving.filter(g => g.givingType === 'Tithe').reduce((sum, g) => sum + g.amount, 0);
  const totalOfferings = giving.filter(g => g.givingType === 'Offering').reduce((sum, g) => sum + g.amount, 0);
  const totalDonations = giving.filter(g => g.givingType === 'Donation' || g.givingType === 'Special Offering').reduce((sum, g) => sum + g.amount, 0);
  const totalGiving = giving.reduce((sum, g) => sum + g.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netSurplus = totalGiving - totalExpenses;

  // SMS stats
  const smsSent = smsMessages.length;
  const smsDelivered = smsMessages.filter(s => s.status === 'Delivered').length;
  const smsFailed = smsMessages.filter(s => s.status === 'Failed' || s.status === 'Unable to Send').length;

  // Follow-ups pending
  const pendingVisitors = visitors.filter(v => v.followUpStatus === 'New' || v.followUpStatus === 'Contacted').length;
  const pendingPastoral = pastoral.filter(p => p.status === 'Open' || p.status === 'In Progress').length;

  // Upcoming events
  const upcomingEvents = events.filter(e => e.status === 'Upcoming').slice(0, 4);

  // Recent transactions
  const recentGiving = [...giving].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  res.json({
    church: {
      id: church.id,
      name: church.name,
      senderName: church.settings.senderName,
      currency: church.settings.currency,
      features: church.features,
      status: church.status,
    },
    kpis: {
      totalMembers,
      activeMembers,
      totalVisitors,
      totalNewConverts,
      todayAttendancePresent,
      todayAttendanceAbsent,
      monthlyAttendancePresent,
      totalTithes,
      totalOfferings,
      totalDonations,
      totalGiving,
      totalExpenses,
      netSurplus,
      smsSent,
      smsDelivered,
      smsFailed,
      pendingFollowups: pendingVisitors + pendingPastoral,
    },
    upcomingEvents,
    recentGiving,
  });
});

// ================= MEMBER MANAGEMENT ================= //
router.get('/members', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { search, status, gender, departmentId } = req.query;

  let members = db.get('members').filter(m => m.churchId === churchId);

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    members = members.filter(
      m => m.fullName.toLowerCase().includes(q) ||
           m.phone.includes(q) ||
           m.memberCode.toLowerCase().includes(q) ||
           m.email.toLowerCase().includes(q)
    );
  }

  if (status && typeof status === 'string') {
    members = members.filter(m => m.membershipStatus === status);
  }

  if (gender && typeof gender === 'string') {
    members = members.filter(m => m.gender === gender);
  }

  if (departmentId && typeof departmentId === 'string') {
    members = members.filter(m => m.departmentIds.includes(departmentId));
  }

  res.json(members);
});

router.post('/members', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const data = req.body;

  if (!data.fullName || !data.phone) {
    res.status(400).json({ error: 'Full name and phone number are required.' });
    return;
  }

  const norm = normalizePhoneNumber(data.phone);
  const now = new Date().toISOString();
  const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Generate member code
  const existingCount = db.get('members').filter(m => m.churchId === churchId).length;
  const memberCode = data.memberCode || `MEM-${String(existingCount + 1).padStart(3, '0')}`;

  const newMember: Member = {
    id,
    churchId,
    memberCode,
    fullName: data.fullName.trim(),
    gender: data.gender || 'Male',
    dateOfBirth: data.dateOfBirth || '',
    phone: data.phone.trim(),
    normalizedPhone: norm.normalized || data.phone.trim(),
    email: (data.email || '').trim().toLowerCase(),
    address: (data.address || '').trim(),
    occupation: (data.occupation || '').trim(),
    maritalStatus: data.maritalStatus || 'Single',
    membershipStatus: data.membershipStatus || 'Active',
    joinDate: data.joinDate || now.slice(0, 10),
    baptismStatus: data.baptismStatus || 'Not Baptized',
    familyId: data.familyId || undefined,
    familyRole: data.familyRole || undefined,
    departmentIds: Array.isArray(data.departmentIds) ? data.departmentIds : [],
    ministryIds: Array.isArray(data.ministryIds) ? data.ministryIds : [],
    groupIds: Array.isArray(data.groupIds) ? data.groupIds : [],
    emergencyContact: data.emergencyContact || { name: '', phone: '', relation: '' },
    photoUrl: data.photoUrl,
    notes: data.notes || '',
    createdAt: now,
  };

  db.update('members', list => [newMember, ...list]);

  // If new member SMS is enabled, queue welcome SMS
  const church = db.get('churches').find(c => c.id === churchId);
  if (church && church.features.sms && data.sendWelcomeSms && norm.isValid) {
    try {
      await SmsService.sendSms({
        churchId,
        recipientName: newMember.fullName,
        phone: newMember.phone,
        message: `Dear ${newMember.fullName}, welcome to the fellowship of ${church.name}! We rejoice to have you in the family of God.`,
        notificationType: 'NEW_MEMBER',
      });
    } catch (err) {
      console.error('Failed to send welcome SMS:', err);
    }
  }

  // Audit log
  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId,
      userId: req.user?.id || 'admin',
      userName: req.user?.fullName || 'Administrator',
      action: 'MEMBER_CREATED',
      details: `Registered member ${newMember.fullName} (${newMember.memberCode}).`,
      timestamp: now,
    },
    ...logs.slice(0, 499),
  ]);

  res.status(201).json(newMember);
});

router.get('/members/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;

  const member = db.get('members').find(m => m.id === id && m.churchId === churchId);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  // Enrich with attendance & giving history
  const attendanceHistory = db.get('attendance').filter(a => a.memberId === id && a.churchId === churchId);
  const givingHistory = db.get('giving').filter(g => g.memberId === id && g.churchId === churchId);

  res.json({
    ...member,
    attendanceHistory,
    givingHistory,
  });
});

router.put('/members/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;
  const updates = req.body;

  const members = db.get('members');
  const existing = members.find(m => m.id === id && m.churchId === churchId);
  if (!existing) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const norm = updates.phone ? normalizePhoneNumber(updates.phone) : { normalized: existing.normalizedPhone };

  db.update('members', list =>
    list.map(m => {
      if (m.id === id && m.churchId === churchId) {
        return {
          ...m,
          ...updates,
          normalizedPhone: norm.normalized || m.normalizedPhone,
        };
      }
      return m;
    })
  );

  res.json({ success: true, message: 'Member updated successfully.' });
});

router.delete('/members/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;

  const member = db.get('members').find(m => m.id === id && m.churchId === churchId);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  db.update('members', list => list.filter(m => !(m.id === id && m.churchId === churchId)));

  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId,
      userId: req.user?.id || 'admin',
      userName: req.user?.fullName || 'Administrator',
      action: 'MEMBER_DELETED',
      details: `Deleted member ${member.fullName} (${member.memberCode}).`,
      timestamp: new Date().toISOString(),
    },
    ...logs.slice(0, 499),
  ]);

  res.json({ success: true, message: 'Member record deleted.' });
});

// ================= FAMILIES ================= //
router.get('/families', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const families = db.get('families').filter(f => f.churchId === churchId);
  res.json(families);
});

router.post('/families', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { familyName, headMemberId, headMemberName, spouseMemberId, spouseMemberName, phone, address, members } = req.body;

  if (!familyName) {
    res.status(400).json({ error: 'Family name is required.' });
    return;
  }

  const id = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newFamily: Family = {
    id,
    churchId,
    familyName: familyName.trim(),
    headMemberId,
    headMemberName: headMemberName || '',
    spouseMemberId,
    spouseMemberName: spouseMemberName || '',
    phone: phone || '',
    address: address || '',
    members: Array.isArray(members) ? members : [],
    createdAt: new Date().toISOString(),
  };

  db.update('families', list => [newFamily, ...list]);
  res.status(201).json(newFamily);
});

// ================= VISITORS ================= //
router.get('/visitors', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const visitors = db.get('visitors').filter(v => v.churchId === churchId);
  res.json(visitors);
});

router.post('/visitors', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const data = req.body;

  if (!data.fullName || !data.phone) {
    res.status(400).json({ error: 'Full name and phone are required.' });
    return;
  }

  const norm = normalizePhoneNumber(data.phone);
  const id = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newVisitor: Visitor = {
    id,
    churchId,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    normalizedPhone: norm.normalized || data.phone.trim(),
    email: (data.email || '').trim().toLowerCase(),
    visitDate: data.visitDate || now.slice(0, 10),
    serviceAttended: data.serviceAttended || 'Sunday Service',
    invitedBy: data.invitedBy || '',
    followUpStatus: data.followUpStatus || 'New',
    assignedPastorLeader: data.assignedPastorLeader || '',
    notes: data.notes || '',
    followUpHistory: [],
    createdAt: now,
  };

  db.update('visitors', list => [newVisitor, ...list]);

  // Send visitor welcome SMS if enabled
  const church = db.get('churches').find(c => c.id === churchId);
  if (church && church.features.sms && norm.isValid) {
    try {
      await SmsService.sendSms({
        churchId,
        recipientName: newVisitor.fullName,
        phone: newVisitor.phone,
        message: `Dear ${newVisitor.fullName}, thank you for worshipping with us at ${church.name} today. We were honored by your presence and pray God's favor rests on you!`,
        notificationType: 'VISITOR_FOLLOWUP',
      });
    } catch (err) {
      console.error('Visitor SMS error:', err);
    }
  }

  res.status(201).json(newVisitor);
});

router.put('/visitors/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;
  const updates = req.body;

  db.update('visitors', list =>
    list.map(v => (v.id === id && v.churchId === churchId ? { ...v, ...updates } : v))
  );

  res.json({ success: true });
});

router.post('/visitors/:id/convert', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;

  const visitors = db.get('visitors');
  const visitor = visitors.find(v => v.id === id && v.churchId === churchId);
  if (!visitor) {
    res.status(404).json({ error: 'Visitor not found' });
    return;
  }

  // Create member from visitor
  const existingCount = db.get('members').filter(m => m.churchId === churchId).length;
  const memberId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const member: Member = {
    id: memberId,
    churchId,
    memberCode: `MEM-${String(existingCount + 1).padStart(3, '0')}`,
    fullName: visitor.fullName,
    gender: 'Male',
    dateOfBirth: '',
    phone: visitor.phone,
    normalizedPhone: visitor.normalizedPhone,
    email: visitor.email,
    address: '',
    occupation: '',
    maritalStatus: 'Single',
    membershipStatus: 'Active',
    joinDate: now.slice(0, 10),
    baptismStatus: 'Not Baptized',
    departmentIds: [],
    ministryIds: [],
    groupIds: [],
    emergencyContact: { name: '', phone: '', relation: '' },
    notes: `Converted from visitor record (${visitor.visitDate}). ${visitor.notes}`,
    createdAt: now,
  };

  db.update('members', list => [member, ...list]);
  db.update('visitors', list =>
    list.map(v => (v.id === id ? { ...v, followUpStatus: 'Joined' as const, convertedToMemberId: memberId } : v))
  );

  res.json({ success: true, message: `${visitor.fullName} has been converted into a registered Church Member.`, member });
});

// ================= NEW CONVERTS ================= //
router.get('/converts', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const converts = db.get('newConverts').filter(c => c.churchId === churchId);
  res.json(converts);
});

router.post('/converts', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const data = req.body;

  if (!data.fullName || !data.phone) {
    res.status(400).json({ error: 'Full name and phone are required.' });
    return;
  }

  const norm = normalizePhoneNumber(data.phone);
  const id = `nc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newConvert: NewConvert = {
    id,
    churchId,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    normalizedPhone: norm.normalized || data.phone.trim(),
    dateOfDecision: data.dateOfDecision || now.slice(0, 10),
    serviceName: data.serviceName || 'Sunday Service',
    assignedLeader: data.assignedLeader || '',
    followUpStatus: data.followUpStatus || 'New',
    discipleshipStatus: data.discipleshipStatus || 'Stage 1: Salvation',
    notes: data.notes || '',
    followUpHistory: [],
    createdAt: now,
  };

  db.update('newConverts', list => [newConvert, ...list]);
  res.status(201).json(newConvert);
});

router.put('/converts/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;
  const updates = req.body;

  db.update('newConverts', list =>
    list.map(c => (c.id === id && c.churchId === churchId ? { ...c, ...updates } : c))
  );

  res.json({ success: true });
});

// ================= SERVICES & ATTENDANCE ================= //
router.get('/services', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const services = db.get('services').filter(s => s.churchId === churchId);
  res.json(services);
});

router.post('/services', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const data = req.body;

  if (!data.serviceName || !data.date) {
    res.status(400).json({ error: 'Service name and date are required.' });
    return;
  }

  const id = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newService: ChurchService = {
    id,
    churchId,
    serviceName: data.serviceName.trim(),
    serviceType: data.serviceType || 'Sunday Service',
    date: data.date,
    startTime: data.startTime || '08:30 AM',
    endTime: data.endTime || '11:00 AM',
    preacher: data.preacher || '',
    worshipLeader: data.worshipLeader || '',
    choir: data.choir || '',
    ushers: data.ushers || '',
    mediaTeam: data.mediaTeam || '',
    notes: data.notes || '',
    attendanceFinalized: false,
    createdAt: new Date().toISOString(),
  };

  db.update('services', list => [newService, ...list]);
  res.status(201).json(newService);
});

router.get('/services/:id/attendance', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;

  const attendance = db.get('attendance').filter(a => a.serviceId === id && a.churchId === churchId);
  res.json(attendance);
});

// Mark / update individual or bulk attendance
router.post('/services/:id/attendance', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;
  const { records } = req.body; // Array of { memberId, status: 'Present' | 'Absent' | 'Excused' }

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ error: 'Attendance records array is required.' });
    return;
  }

  const services = db.get('services');
  const service = services.find(s => s.id === id && s.churchId === churchId);
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  const members = db.get('members');
  const now = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  db.update('attendance', existingList => {
    // Keep other records, replace matching ones
    const filtered = existingList.filter(a => !(a.serviceId === id && a.churchId === churchId && records.some(r => r.memberId === a.memberId)));

    const newEntries: AttendanceRecord[] = records.map(r => {
      const member = members.find(m => m.id === r.memberId && m.churchId === churchId);
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        churchId,
        serviceId: id,
        serviceName: service.serviceName,
        serviceDate: service.date,
        memberId: r.memberId,
        memberName: member ? member.fullName : 'Member',
        memberPhone: member ? member.phone : '',
        status: r.status,
        checkInTime: r.status === 'Present' ? timeStr : '-',
        checkInMethod: 'Manual',
        markedBy: req.user?.fullName || 'Admin',
        createdAt: now,
      };
    });

    return [...newEntries, ...filtered];
  });

  res.json({ success: true, message: `Updated attendance for ${records.length} member(s).` });
});

// CRITICAL REQUIREMENT: Finalize Attendance and trigger automated Absence SMS!
router.post('/services/:id/finalize-attendance', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;

  try {
    const finalizedBy = req.user?.fullName || 'Church Administrator';
    const result = await SmsService.processAttendanceAbsenceSms(churchId, id, finalizedBy);

    res.json({
      success: true,
      message: `Attendance finalized for service. Detected ${result.totalAbsent} absences: ${result.sent} absence SMS dispatched, ${result.skipped} skipped/duplicate prevented.`,
      stats: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to finalize attendance.' });
  }
});

// ================= TITHES & GIVING ================= //
router.get('/giving', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const giving = db.get('giving').filter(g => g.churchId === churchId);
  res.json(giving);
});

router.post('/giving', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const data = req.body;

  if (!data.amount || !data.givingType) {
    res.status(400).json({ error: 'Amount and giving type are required.' });
    return;
  }

  const numAmount = parseFloat(data.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Please enter a valid amount.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  const id = `giv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const receiptCount = db.get('giving').filter(g => g.churchId === churchId).length + 1;
  const receiptNumber = `RCP-${new Date().getFullYear()}-${String(receiptCount).padStart(4, '0')}`;
  const now = new Date().toISOString();

  // If member selected, get member details
  let memberName = data.memberName || 'Anonymous Giver';
  let memberPhone = data.phone;
  if (data.memberId) {
    const member = db.get('members').find(m => m.id === data.memberId && m.churchId === churchId);
    if (member) {
      memberName = member.fullName;
      memberPhone = memberPhone || member.phone;
    }
  }

  const newGiving: GivingRecord = {
    id,
    churchId,
    memberId: data.memberId,
    memberName,
    phone: memberPhone,
    amount: numAmount,
    currency: church?.settings.currency || 'GH₵',
    givingType: data.givingType,
    date: data.date || now.slice(0, 10),
    paymentMethod: data.paymentMethod || 'Cash',
    referenceNumber: data.referenceNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
    campaignOrProject: data.campaignOrProject,
    receiptNumber,
    notes: data.notes,
    smsSent: false,
    recordedBy: req.user?.fullName || 'Finance Officer',
    createdAt: now,
  };

  db.update('giving', list => [newGiving, ...list]);

  // AUTOMATIC TITHE SMS NOTIFICATION (Prompt Requirement 20)
  let smsResult = null;
  if (newGiving.givingType === 'Tithe' && memberPhone) {
    smsResult = await SmsService.sendTitheConfirmation(churchId, id);
  }

  // Audit log
  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId,
      userId: req.user?.id || 'finance',
      userName: req.user?.fullName || 'Finance Officer',
      action: 'GIVING_RECORDED',
      details: `Recorded ${newGiving.givingType} of ${newGiving.currency}${newGiving.amount} from ${newGiving.memberName}. Receipt: ${newGiving.receiptNumber}.`,
      timestamp: now,
    },
    ...logs.slice(0, 499),
  ]);

  res.status(201).json({
    giving: newGiving,
    smsNotification: smsResult ? { sent: smsResult.success, message: smsResult.smsMessage } : null,
  });
});

// ================= FINANCE ACCOUNTS & EXPENSES ================= //
router.get('/finance/accounts', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const accounts = db.get('accounts').filter(a => a.churchId === churchId);
  res.json(accounts);
});

router.post('/finance/accounts', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { accountName, accountType, balance, accountNumber, institution } = req.body;

  if (!accountName || !accountType) {
    res.status(400).json({ error: 'Account name and type are required.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newAccount = {
    id,
    churchId,
    accountName: accountName.trim(),
    accountType,
    balance: parseFloat(balance) || 0,
    currency: church?.settings.currency || 'GH₵',
    accountNumber,
    institution,
  };

  db.update('accounts', list => [newAccount, ...list]);
  res.status(201).json(newAccount);
});

router.get('/finance/expenses', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const expenses = db.get('expenses').filter(e => e.churchId === churchId);
  res.json(expenses);
});

router.post('/finance/expenses', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { category, amount, payee, paymentMethod, description, date } = req.body;

  if (!category || !amount || !payee) {
    res.status(400).json({ error: 'Category, amount, and payee are required.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newExpense: ExpenseRecord = {
    id,
    churchId,
    category,
    amount: parseFloat(amount) || 0,
    currency: church?.settings.currency || 'GH₵',
    date: date || now.slice(0, 10),
    payee: payee.trim(),
    paymentMethod: paymentMethod || 'Cash',
    approvalStatus: 'Approved',
    description: description || '',
    recordedBy: req.user?.fullName || 'Finance Officer',
    createdAt: now,
  };

  db.update('expenses', list => [newExpense, ...list]);
  res.status(201).json(newExpense);
});

// ================= PASTORAL CARE (CONFIDENTIAL) ================= //
router.get('/pastoral', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const cases = db.get('pastoralCases').filter(p => p.churchId === churchId);
  res.json(cases);
});

router.post('/pastoral', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { caseType, memberNameOrSubject, phone, assignedPastor, priority, confidentialNotes, followUpDate } = req.body;

  if (!caseType || !memberNameOrSubject) {
    res.status(400).json({ error: 'Case type and subject name are required.' });
    return;
  }

  const id = `pas_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newCase: PastoralCase = {
    id,
    churchId,
    caseType,
    memberNameOrSubject: memberNameOrSubject.trim(),
    phone: phone || '',
    assignedPastor: assignedPastor || req.user?.fullName || 'Pastor',
    priority: priority || 'Normal',
    status: 'Open',
    confidentialNotes: confidentialNotes || '',
    followUpDate,
    history: [
      {
        date: now.slice(0, 10),
        action: 'Case Created',
        notes: 'Initial pastoral case opened.',
        by: req.user?.fullName || 'Pastor',
      },
    ],
    createdAt: now,
  };

  db.update('pastoralCases', list => [newCase, ...list]);
  res.status(201).json(newCase);
});

router.put('/pastoral/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;
  const updates = req.body;

  db.update('pastoralCases', list =>
    list.map(p => (p.id === id && p.churchId === churchId ? { ...p, ...updates } : p))
  );

  res.json({ success: true });
});

// ================= DEPARTMENTS & MINISTRIES ================= //
router.get('/departments', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const departments = db.get('departments').filter(d => d.churchId === churchId);
  res.json(departments);
});

router.post('/departments', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { name, type, leaderName, leaderPhone, meetingDay, meetingTime, meetingLocation, description } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: 'Name and type are required.' });
    return;
  }

  const id = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newDept: DepartmentOrGroup = {
    id,
    churchId,
    name: name.trim(),
    type: type || 'department',
    leaderName: leaderName || '',
    leaderPhone: leaderPhone || '',
    meetingDay: meetingDay || '',
    meetingTime: meetingTime || '',
    meetingLocation: meetingLocation || '',
    memberCount: 0,
    description: description || '',
    createdAt: new Date().toISOString(),
  };

  db.update('departments', list => [newDept, ...list]);
  res.status(201).json(newDept);
});

// ================= EVENTS & CALENDAR ================= //
router.get('/events', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const events = db.get('events').filter(e => e.churchId === churchId);
  res.json(events);
});

router.post('/events', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { title, date, startTime, endTime, venue, description, organizer } = req.body;

  if (!title || !date) {
    res.status(400).json({ error: 'Event title and date are required.' });
    return;
  }

  const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newEvent: ChurchEvent = {
    id,
    churchId,
    title: title.trim(),
    date,
    startTime: startTime || '09:00 AM',
    endTime: endTime || '12:00 PM',
    venue: venue || 'Main Sanctuary',
    description: description || '',
    organizer: organizer || req.user?.fullName || 'Church Leadership',
    reminderScheduled: false,
    status: 'Upcoming',
    createdAt: new Date().toISOString(),
  };

  db.update('events', list => [newEvent, ...list]);
  res.status(201).json(newEvent);
});

// ================= SMS COMMUNICATION (CHURCH TENANT) ================= //
router.get('/sms/messages', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const messages = db.get('smsMessages').filter(s => s.churchId === churchId);
  res.json(messages);
});

// Dispatch single or Bulk SMS
router.post('/sms/send', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { recipientType, recipients, message, notificationType, customNumbers } = req.body;

  if (!message || message.trim().length === 0) {
    res.status(400).json({ error: 'SMS message body cannot be empty.' });
    return;
  }

  const members = db.get('members').filter(m => m.churchId === churchId);
  let targetRecipients: Array<{ name: string; phone: string }> = [];

  if (recipientType === 'ALL_MEMBERS') {
    targetRecipients = members.map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'ACTIVE_MEMBERS') {
    targetRecipients = members.filter(m => m.membershipStatus === 'Active').map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'DEPARTMENT' && req.body.departmentId) {
    targetRecipients = members.filter(m => m.departmentIds.includes(req.body.departmentId)).map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'CUSTOM_LIST' && Array.isArray(recipients)) {
    targetRecipients = recipients;
  } else if (recipientType === 'RAW_NUMBERS' && typeof customNumbers === 'string') {
    const rawList = customNumbers.split(/[\n,;]/).map(n => n.trim()).filter(n => n.length > 0);
    targetRecipients = rawList.map((p, idx) => ({ name: `Contact ${idx + 1}`, phone: p }));
  } else if (req.body.phone) {
    targetRecipients = [{ name: req.body.name || 'Recipient', phone: req.body.phone }];
  }

  if (targetRecipients.length === 0) {
    res.status(400).json({ error: 'No valid recipients resolved for this dispatch.' });
    return;
  }

  let sent = 0;
  let failed = 0;
  const results: any[] = [];

  for (const item of targetRecipients) {
    try {
      const resSend = await SmsService.sendSms({
        churchId,
        recipientName: item.name,
        phone: item.phone,
        message: message.trim(),
        notificationType: notificationType || 'BULK_ANNOUNCEMENT',
      });

      if (resSend.success) sent++;
      else failed++;
      results.push(resSend.smsMessage);
    } catch (err: any) {
      failed++;
    }
  }

  res.json({
    success: true,
    totalTargeted: targetRecipients.length,
    sent,
    failed,
    results: results.slice(0, 10),
    message: `SMS batch processed: ${sent} sent successfully, ${failed} failed/invalid numbers.`,
  });
});

// Dispatch Tithe Reminder SMS (Prompt Requirement 21)
router.post('/sms/tithe-reminders', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const church = db.get('churches').find(c => c.id === churchId);

  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  const members = db.get('members').filter(m => m.churchId === churchId && m.membershipStatus === 'Active');
  const template = req.body.template || church.settings.titheReminderTemplate ||
    "Dear [Member Name], this is a friendly reminder regarding your church giving. Thank you for your continued support. — [Church Name]";

  let sent = 0;
  let skipped = 0;

  for (const member of members) {
    const msg = template
      .replace(/\[Member Name\]/g, member.fullName)
      .replace(/\[Church Name\]/g, church.name);

    // Prevent spamming: key includes current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const idempotencyKey = `tithe_reminder_${churchId}_${member.id}_${currentMonth}`;

    try {
      const resSend = await SmsService.sendSms({
        churchId,
        recipientName: member.fullName,
        phone: member.phone,
        message: msg,
        notificationType: 'GIVING_REMINDER',
        idempotencyKey,
      });

      if (resSend.success && !resSend.alreadySent) {
        sent++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  res.json({
    success: true,
    sent,
    skipped,
    message: `Giving reminders processed for active members: ${sent} delivered, ${skipped} skipped (duplicates/invalids).`,
  });
});

// GET & PUT Church Settings
router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }
  res.json({
    churchName: church.name,
    email: church.email,
    phone: church.phone,
    address: church.address,
    city: church.city,
    region: church.region,
    country: church.country,
    seniorPastor: church.seniorPastor,
    settings: church.settings,
    features: church.features,
    subscription: church.subscription,
  });
});

router.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { settings, basicInfo } = req.body;

  const churches = db.get('churches');
  const church = churches.find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  db.update('churches', list =>
    list.map(c => {
      if (c.id === churchId) {
        return {
          ...c,
          ...(basicInfo || {}),
          settings: {
            ...c.settings,
            ...(settings || {}),
          },
        };
      }
      return c;
    })
  );

  res.json({ success: true, message: 'Church settings updated successfully.' });
});

export default router;
