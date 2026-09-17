import { Router, Response } from 'express';
import { db, Member, Family, Visitor, NewConvert, ChurchService, AttendanceRecord, GivingRecord, ExpenseRecord, PastoralCase, DepartmentOrGroup, ChurchEvent, SmsMessage } from '../db';
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

// Computes Monday to Sunday range of current week
function getWeekRange(refDate = new Date()) {
  const current = new Date(refDate);
  const day = current.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

export function calculateUpcomingBirthdays(members: Member[], churchId: string, smsMessages: SmsMessage[], refDate = new Date()) {
  const { monday, sunday } = getWeekRange(refDate);
  const todayMonth = refDate.getMonth() + 1; // 1-12
  const todayDate = refDate.getDate(); // 1-31
  const todayYear = refDate.getFullYear();
  const todayYMD = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;

  const weekDays: Array<{ month: number; day: number; dateObj: Date; dayName: string; isToday: boolean; isTomorrow: boolean; daysDiff: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const m = d.getMonth() + 1;
    const dt = d.getDate();
    const daysDiff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(todayYear, todayMonth - 1, todayDate).getTime()) / (1000 * 60 * 60 * 24));
    weekDays.push({
      month: m,
      day: dt,
      dateObj: d,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday: daysDiff === 0,
      isTomorrow: daysDiff === 1,
      daysDiff,
    });
  }

  const result: any[] = [];

  for (const member of members) {
    if (!member.dateOfBirth) continue;
    const parts = member.dateOfBirth.split('-');
    let birthMonth: number;
    let birthDay: number;
    let birthYear: number | null = null;
    if (parts.length === 3) {
      birthYear = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10);
      birthDay = parseInt(parts[2], 10);
    } else if (parts.length === 2) {
      birthMonth = parseInt(parts[0], 10);
      birthDay = parseInt(parts[1], 10);
    } else {
      continue;
    }

    const matchedDay = weekDays.find(w => w.month === birthMonth && w.day === birthDay);
    if (!matchedDay) continue;

    const age = birthYear ? todayYear - birthYear : undefined;

    const alreadySentToday = smsMessages.some(sms =>
      sms.churchId === churchId &&
      sms.notificationType === 'BIRTHDAY_GREETING' &&
      (sms.recipientName === member.fullName || sms.phone === member.phone) &&
      (sms.sentAt || sms.createdAt || '').startsWith(todayYMD)
    );

    result.push({
      memberId: member.id,
      fullName: member.fullName,
      phone: member.phone,
      normalizedPhone: member.normalizedPhone || member.phone,
      dateOfBirth: member.dateOfBirth,
      birthDateFormatted: matchedDay.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dayOfWeek: matchedDay.dayName,
      isToday: matchedDay.isToday,
      isTomorrow: matchedDay.isTomorrow,
      daysDiff: matchedDay.daysDiff,
      age,
      gender: member.gender,
      departmentIds: member.departmentIds || [],
      alreadySentToday,
    });
  }

  result.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (a.daysDiff >= 0 && b.daysDiff >= 0) return a.daysDiff - b.daysDiff;
    if (a.daysDiff >= 0 && b.daysDiff < 0) return -1;
    if (a.daysDiff < 0 && b.daysDiff >= 0) return 1;
    return a.daysDiff - b.daysDiff;
  });

  return {
    weekRange: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    totalThisWeek: result.length,
    todayCount: result.filter(r => r.isToday).length,
    upcomingCount: result.filter(r => r.daysDiff >= 0).length,
    birthdays: result,
  };
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

  let members = db.get('members').filter(m => m.churchId === churchId);
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

  // SMS dispatches count (sanitized for church view)
  const recentDispatchesCount = smsMessages.length;

  // Follow-ups pending
  const pendingVisitors = visitors.filter(v => v.followUpStatus === 'New' || v.followUpStatus === 'Contacted').length;
  const pendingPastoral = pastoral.filter(p => p.status === 'Open' || p.status === 'In Progress').length;

  // Upcoming events
  const upcomingEvents = events.filter(e => e.status === 'Upcoming').slice(0, 4);

  // Recent transactions
  const recentGiving = [...giving].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // Upcoming member birthdays for current week
  const upcomingBirthdays = calculateUpcomingBirthdays(members, churchId, smsMessages);

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
      recentDispatchesCount,
      pendingPastoral,
      pendingVisitors,
      pendingFollowups: pendingVisitors + pendingPastoral,
    },
    upcomingEvents,
    recentGiving,
    upcomingBirthdays,
  });
});

// ================= BIRTHDAYS & AUTOMATED GREETINGS ================= //
router.get('/birthdays/upcoming', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const members = db.get('members').filter(m => m.churchId === churchId);
  const smsMessages = db.get('smsMessages').filter(s => s.churchId === churchId);
  const data = calculateUpcomingBirthdays(members, churchId, smsMessages);
  res.json(data);
});

router.post('/birthdays/send-greeting', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { memberId, sendToAllToday, customMessage } = req.body;

  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  const members = db.get('members').filter(m => m.churchId === churchId);
  let targetMembers: Member[] = [];

  if (memberId) {
    const target = members.find(m => m.id === memberId);
    if (!target) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }
    targetMembers = [target];
  } else if (sendToAllToday) {
    const now = new Date();
    const tMonth = now.getMonth() + 1;
    const tDate = now.getDate();

    targetMembers = members.filter(m => {
      if (!m.dateOfBirth) return false;
      const parts = m.dateOfBirth.split('-');
      if (parts.length < 2) return false;
      const mMonth = parseInt(parts.length === 3 ? parts[1] : parts[0], 10);
      const mDay = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);
      return mMonth === tMonth && mDay === tDate;
    });

    if (targetMembers.length === 0) {
      res.status(400).json({ error: 'No member birthdays found celebrating today.' });
      return;
    }
  } else {
    res.status(400).json({ error: 'Please specify memberId or set sendToAllToday: true.' });
    return;
  }

  const defaultGreetingTemplate =
    "Happy Birthday, [Member Name]! 🎉 The leadership and entire family of [Church Name] celebrate the grace and goodness of God upon your life today. May your new year be crowned with divine favour, joy, and peace! Have a glorious celebration. 🎂";

  const template = customMessage && customMessage.trim().length > 0 ? customMessage.trim() : defaultGreetingTemplate;

  const todayStr = new Date().toISOString().slice(0, 10);
  let sent = 0;
  let failed = 0;
  const results: any[] = [];

  for (const member of targetMembers) {
    const personalizedMessage = template
      .replace(/\[Member Name\]/g, member.fullName)
      .replace(/\[Church Name\]/g, church.name);

    const idempotencyKey = `bday_${churchId}_${member.id}_${todayStr}`;

    try {
      const sendRes = await SmsService.sendSms({
        churchId,
        recipientName: member.fullName,
        phone: member.phone,
        message: personalizedMessage,
        notificationType: 'BIRTHDAY_GREETING',
        idempotencyKey,
      });

      if (sendRes.success) {
        sent++;
      } else {
        failed++;
      }
      results.push({
        memberId: member.id,
        memberName: member.fullName,
        phone: member.phone,
        success: sendRes.success,
        alreadySent: sendRes.alreadySent,
        message: personalizedMessage,
      });
    } catch (err: any) {
      failed++;
      results.push({
        memberId: member.id,
        memberName: member.fullName,
        phone: member.phone,
        success: false,
        error: err.message,
      });
    }
  }

  res.json({
    success: true,
    sent,
    failed,
    totalTargeted: targetMembers.length,
    message: sent > 0
      ? `Automated birthday greeting SMS sent to ${sent} celebrant(s) via registered sender ID "${church.settings.senderName || church.name.slice(0, 11).toUpperCase()}".`
      : 'Failed to dispatch birthday SMS.',
    results,
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

  // AUTOMATIC CONTRIBUTION SMS NOTIFICATION (Requirements 2, 3, 10)
  let smsResult = null;
  try {
    smsResult = await SmsService.sendContributionConfirmation(churchId, id);
  } catch (err) {
    console.error('Automatic contribution SMS error:', err);
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
  const visitors = db.get('visitors').filter(v => v.churchId === churchId);
  const users = db.get('users').filter(u => u.churchId === churchId);
  let targetRecipients: Array<{ name: string; phone: string; memberId?: string }> = [];

  if (recipientType === 'SELECTED_MEMBERS' && Array.isArray(req.body.memberIds)) {
    const selectedIds: string[] = req.body.memberIds;
    const selectedMembers = members.filter(m => selectedIds.includes(m.id));
    targetRecipients = selectedMembers.map(m => ({ name: m.fullName, phone: m.phone, memberId: m.id }));
  } else if (recipientType === 'ALL_MEMBERS') {
    targetRecipients = members.map(m => ({ name: m.fullName, phone: m.phone, memberId: m.id }));
  } else if (recipientType === 'ACTIVE_MEMBERS') {
    targetRecipients = members.filter(m => m.membershipStatus === 'Active').map(m => ({ name: m.fullName, phone: m.phone, memberId: m.id }));
  } else if (recipientType === 'PARENTS') {
    // Parents: Head or Spouse of families, or members with family role
    const parents = members.filter(m => m.familyRole === 'Head' || m.familyRole === 'Spouse' || m.maritalStatus === 'Married');
    targetRecipients = (parents.length > 0 ? parents : members).map(m => ({ name: m.fullName, phone: m.phone, memberId: m.id }));
  } else if (recipientType === 'TEACHERS') {
    // Sunday school teachers, children unit leaders, ministry leaders
    const depts = db.get('departments').filter(d => d.churchId === churchId);
    const teacherDeptIds = depts.filter(d => /children|sunday|teacher|youth|education|class/i.test(d.name)).map(d => d.id);
    const teachers = members.filter(m => m.departmentIds.some(id => teacherDeptIds.includes(id)));
    targetRecipients = (teachers.length > 0 ? teachers : members.slice(0, 10)).map(m => ({ name: m.fullName, phone: m.phone, memberId: m.id }));
  } else if (recipientType === 'STAFF') {
    // Church staff, ministers, pastors, departmental leaders
    const staffFromUsers = users.map(u => ({ name: u.fullName, phone: u.phone || '' })).filter(u => u.phone.length > 0);
    const staffFromMembers = members.filter(m => /pastor|minister|leader|elder|deacon|worker|staff/i.test(m.occupation || ''));
    const combined = [...staffFromUsers, ...staffFromMembers.map(m => ({ name: m.fullName, phone: m.phone }))];
    targetRecipients = combined.length > 0 ? combined : members.slice(0, 5).map(m => ({ name: m.fullName, phone: m.phone, memberId: m.id }));
  } else if (recipientType === 'VISITORS') {
    targetRecipients = visitors.map(v => ({ name: v.fullName, phone: v.phone }));
  } else if (recipientType === 'DEPARTMENT' && req.body.departmentId) {
    targetRecipients = members.filter(m => m.departmentIds.includes(req.body.departmentId)).map(m => ({ name: m.fullName, phone: m.phone, memberId: m.id }));
  } else if (recipientType === 'CUSTOM_LIST' && Array.isArray(recipients)) {
    targetRecipients = recipients;
  } else if (recipientType === 'RAW_NUMBERS' && typeof customNumbers === 'string') {
    const rawList = customNumbers.split(/[\n,;]/).map(n => n.trim()).filter(n => n.length > 0);
    targetRecipients = rawList.map((p, idx) => ({ name: `Contact ${idx + 1}`, phone: p }));
  } else if (req.body.phone) {
    targetRecipients = [{ name: req.body.name || 'Recipient', phone: req.body.phone }];
  }

  if (targetRecipients.length === 0) {
    res.status(400).json({ error: 'No valid recipients selected or resolved for this dispatch.' });
    return;
  }

  // Generate batch transaction token to prevent accidental duplicate dispatch if button clicked twice
  const batchToken = req.body.clientBatchId || `batch_${Date.now()}`;
  let sent = 0;
  let failed = 0;
  let skippedNoPhone = 0;
  const results: any[] = [];

  for (const item of targetRecipients) {
    const norm = normalizePhoneNumber(item.phone);
    if (!norm.isValid) {
      skippedNoPhone++;
      failed++;
      results.push({
        recipientName: item.name,
        phone: item.phone || '',
        status: 'Unable to Send',
        failureReason: 'Unable to Send — No Valid Phone Number',
      });
      continue;
    }

    const idempotencyKey = `sms_${churchId}_${batchToken}_${item.phone}`;
    try {
      const resSend = await SmsService.sendSms({
        churchId,
        recipientName: item.name,
        phone: item.phone,
        message: message.trim(),
        notificationType: notificationType || (recipientType === 'SELECTED_MEMBERS' ? 'MEMBER_UPDATE' : 'BULK_ANNOUNCEMENT'),
        idempotencyKey,
      });

      if (resSend.success && !resSend.alreadySent) sent++;
      else if (resSend.alreadySent) sent++; // already dispatched
      else failed++;
      results.push(resSend.smsMessage);
    } catch (err: any) {
      failed++;
      results.push({
        recipientName: item.name,
        phone: item.phone,
        status: 'Failed',
        failureReason: err.message || 'Dispatch error',
      });
    }
  }

  res.json({
    success: true,
    totalTargeted: targetRecipients.length,
    sent,
    failed,
    skippedNoPhone,
    results: results.slice(0, 50),
    message: `SMS dispatch completed: ${sent} delivered, ${failed} failed (${skippedNoPhone} without valid phone numbers).`,
  });
});

// Test SMS Gateway Connection endpoint (Requirement 4)
router.post('/sms/test-connection', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { apiKey, senderId, testPhone, gateway } = req.body;

  try {
    const result = await SmsService.testChurchGatewayConnection({
      churchId,
      apiKey,
      senderId,
      testPhone,
      gateway,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
  }
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

// Aliases for church communication routes
router.get('/communication/sms-logs', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const messages = db.get('smsMessages').filter(s => s.churchId === churchId);
  // Return messages with delivery status, contribution receipt reference, and failure reason
  const sanitized = messages.map(m => ({
    id: m.id,
    recipientName: m.recipientName,
    phone: m.phone,
    normalizedPhone: m.normalizedPhone,
    senderName: m.senderName,
    message: m.message,
    notificationType: m.notificationType,
    status: m.status,
    failureReason: m.failureReason,
    relatedReceiptNumber: m.relatedReceiptNumber,
    relatedContributionId: m.relatedContributionId,
    sentAt: m.sentAt || m.createdAt,
    createdAt: m.createdAt,
  }));
  res.json(sanitized);
});

router.post('/communication/send-sms', async (req: AuthenticatedRequest, res: Response) => {
  // Re-route to same logic as /sms/send
  const churchId = getChurchId(req);
  const { recipientType, recipients, message, notificationType, customNumbers } = req.body;

  if (!message || message.trim().length === 0) {
    res.status(400).json({ error: 'SMS message body cannot be empty.' });
    return;
  }

  const members = db.get('members').filter(m => m.churchId === churchId);
  const visitors = db.get('visitors').filter(v => v.churchId === churchId);
  const users = db.get('users').filter(u => u.churchId === churchId);
  let targetRecipients: Array<{ name: string; phone: string }> = [];

  if (recipientType === 'SELECTED_MEMBERS' && Array.isArray(req.body.memberIds)) {
    const selectedIds: string[] = req.body.memberIds;
    const selectedMembers = members.filter(m => selectedIds.includes(m.id));
    targetRecipients = selectedMembers.map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'ALL_MEMBERS') {
    targetRecipients = members.map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'ACTIVE_MEMBERS') {
    targetRecipients = members.filter(m => m.membershipStatus === 'Active').map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'PARENTS') {
    const parents = members.filter(m => m.familyRole === 'Head' || m.familyRole === 'Spouse' || m.maritalStatus === 'Married');
    targetRecipients = (parents.length > 0 ? parents : members).map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'TEACHERS') {
    const depts = db.get('departments').filter(d => d.churchId === churchId);
    const teacherDeptIds = depts.filter(d => /children|sunday|teacher|youth|education|class/i.test(d.name)).map(d => d.id);
    const teachers = members.filter(m => m.departmentIds.some(id => teacherDeptIds.includes(id)));
    targetRecipients = (teachers.length > 0 ? teachers : members.slice(0, 10)).map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'STAFF') {
    const staffFromUsers = users.map(u => ({ name: u.fullName, phone: u.phone || '' })).filter(u => u.phone.length > 0);
    const staffFromMembers = members.filter(m => /pastor|minister|leader|elder|deacon|worker|staff/i.test(m.occupation || ''));
    const combined = [...staffFromUsers, ...staffFromMembers.map(m => ({ name: m.fullName, phone: m.phone }))];
    targetRecipients = combined.length > 0 ? combined : members.slice(0, 5).map(m => ({ name: m.fullName, phone: m.phone }));
  } else if (recipientType === 'VISITORS') {
    targetRecipients = visitors.map(v => ({ name: v.fullName, phone: v.phone }));
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
    res.status(400).json({ error: 'No valid recipients found.' });
    return;
  }

  let sent = 0;
  let failed = 0;
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
    } catch {
      failed++;
    }
  }

  res.json({
    success: true,
    totalTargeted: targetRecipients.length,
    sent,
    failed,
    message: `Dispatched to ${sent} contacts (${failed} failed or invalid).`,
  });
});

router.post('/communication/tithe-reminder', async (req: AuthenticatedRequest, res: Response) => {
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
    message: `Giving reminders processed: ${sent} delivered, ${skipped} skipped.`,
  });
});

// GET & PUT Church Settings
router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const isAdminOrPastor = user && [
    'SUPER_ADMIN',
    'CHURCH_OWNER',
    'CHURCH_ADMINISTRATOR',
    'SENIOR_PASTOR',
    'PASTOR_MINISTER',
  ].includes(user.role);

  if (!isAdminOrPastor) {
    res.status(403).json({ error: 'Access denied. Administrator privileges required to access church configuration and API keys.' });
    return;
  }

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
  const user = req.user;
  const isAdminOrPastor = user && [
    'SUPER_ADMIN',
    'CHURCH_OWNER',
    'CHURCH_ADMINISTRATOR',
    'SENIOR_PASTOR',
    'PASTOR_MINISTER',
  ].includes(user.role);

  if (!isAdminOrPastor) {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    return;
  }

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
