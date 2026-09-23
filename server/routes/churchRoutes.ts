import { Router, Response } from 'express';
import { db, Member, Family, Visitor, NewConvert, ChurchService, AttendanceRecord, GivingRecord, ExpenseRecord, PastoralCase, DepartmentOrGroup, ChurchEvent, SmsMessage, User, hashPassword, getDefaultRolePermissions } from '../db';
import { requireAuth, enforceTenant, AuthenticatedRequest } from '../auth';
import { SmsService, normalizePhoneNumber } from '../smsService';

const router = Router();

// Ensure all church routes require authentication and strictly enforce tenant isolation
router.use(requireAuth);
router.use(enforceTenant);

function getChurchId(req: AuthenticatedRequest): string {
  // If user belongs to a church, use that
  if (req.user?.churchId) {
    return req.user.churchId;
  }
  // If Super Admin or query/params provided an explicit churchId, use it
  const explicit = (req.query.churchId || req.params.churchId || req.church?.id) as string;
  if (explicit) {
    return explicit;
  }
  // Fallback to first available church in the system
  const firstChurch = db.get('churches')[0];
  return firstChurch ? firstChurch.id : 'ch_grace_temple';
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
    "Happy Birthday, [Member Name]! 🎉 We celebrate the grace and goodness of God upon your life today. May your new year be crowned with divine favour, joy, and peace! Have a glorious celebration. 🎂";

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
  await db.saveDoc('members', id, newMember).catch(console.error);

  // If new member SMS is enabled, queue welcome SMS
  const church = db.get('churches').find(c => c.id === churchId);
  if (church && church.features.sms && data.sendWelcomeSms && norm.isValid) {
    try {
      await SmsService.sendSms({
        churchId,
        memberId: newMember.id,
        recipientName: newMember.fullName,
        phone: newMember.phone,
        message: `Dear ${newMember.fullName}, welcome to our fellowship! We rejoice to have you in the family of God.`,
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

router.put('/members/:id', async (req: AuthenticatedRequest, res: Response) => {
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

  const updatedMember: Member = {
    ...existing,
    ...updates,
    normalizedPhone: norm.normalized || existing.normalizedPhone,
    dateOfBirth: updates.dateOfBirth !== undefined ? updates.dateOfBirth : existing.dateOfBirth,
    photoUrl: updates.photoUrl !== undefined ? updates.photoUrl : existing.photoUrl,
    updatedAt: new Date().toISOString(),
  };

  db.update('members', list =>
    list.map(m => (m.id === id && m.churchId === churchId ? updatedMember : m))
  );
  await db.saveDoc('members', id, updatedMember);

  res.json({ success: true, member: updatedMember, message: 'Member updated successfully.' });
});

router.delete('/members/:id', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;

  const member = db.get('members').find(m => m.id === id && m.churchId === churchId);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  // Delete directly from Firestore & memory
  await db.deleteDoc('members', id);

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

  res.json({ success: true, message: `Member ${member.fullName} deleted successfully.` });
});

router.post('/members/batch-delete', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { memberIds } = req.body;
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    res.status(400).json({ error: 'No member IDs provided for deletion.' });
    return;
  }

  let deletedCount = 0;
  for (const id of memberIds) {
    const mem = db.get('members').find(m => m.id === id && m.churchId === churchId);
    if (mem) {
      await db.deleteDoc('members', id);
      deletedCount++;
    }
  }

  res.json({ success: true, deletedCount, message: `Successfully deleted ${deletedCount} member record(s).` });
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
        message: `Dear ${newVisitor.fullName}, thank you for worshipping with us today. We were honored by your presence and pray God's favor rests on you!`,
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
const STANDARD_GIVING_TYPES = [
  'Tithe',
  'Offering',
  'Thanksgiving',
  'First Fruit',
  'Building Fund',
  'Missions',
  'Welfare',
  'Special Offering',
  'Donation',
];

router.get('/giving-types', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const church = db.get('churches').find(c => c.id === churchId);
  const customTypes: string[] = church?.settings?.customGivingTypes || [];
  const allTypes = Array.from(new Set([...STANDARD_GIVING_TYPES, ...customTypes]));
  res.json({
    standardTypes: STANDARD_GIVING_TYPES,
    customTypes,
    allTypes,
  });
});

router.post('/giving-types', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { name, enableAutoSms } = req.body;
  const trimmed = (name || '').trim();
  if (!trimmed) {
    res.status(400).json({ error: 'Giving type name is required.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found.' });
    return;
  }

  const existingCustom: string[] = church.settings?.customGivingTypes || [];
  if (STANDARD_GIVING_TYPES.includes(trimmed)) {
    res.status(400).json({ error: `"${trimmed}" is already a standard giving type.` });
    return;
  }

  const updatedCustom = existingCustom.includes(trimmed) ? existingCustom : [...existingCustom, trimmed];
  const autoTypes = church.settings?.autoContributionSmsTypes || [];
  const updatedAutoTypes = enableAutoSms && !autoTypes.includes(trimmed) ? [...autoTypes, trimmed] : autoTypes;

  const updatedSettings = {
    ...church.settings,
    customGivingTypes: updatedCustom,
    autoContributionSmsTypes: updatedAutoTypes,
  };

  db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
  await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);

  res.status(201).json({
    message: `Custom giving type "${trimmed}" created successfully.`,
    customTypes: updatedCustom,
    allTypes: Array.from(new Set([...STANDARD_GIVING_TYPES, ...updatedCustom])),
  });
});

router.delete('/giving-types/:name', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const nameToDelete = decodeURIComponent(req.params.name).trim();

  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found.' });
    return;
  }

  const existingCustom: string[] = church.settings?.customGivingTypes || [];
  const updatedCustom = existingCustom.filter(t => t.toLowerCase() !== nameToDelete.toLowerCase());
  const updatedAuto = (church.settings?.autoContributionSmsTypes || []).filter(t => t.toLowerCase() !== nameToDelete.toLowerCase());

  const updatedSettings = {
    ...church.settings,
    customGivingTypes: updatedCustom,
    autoContributionSmsTypes: updatedAuto,
  };

  db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
  await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);

  res.json({
    message: `Custom giving type "${nameToDelete}" removed.`,
    customTypes: updatedCustom,
    allTypes: Array.from(new Set([...STANDARD_GIVING_TYPES, ...updatedCustom])),
  });
});

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
  const normalizedGivingType = (data.givingType || '').trim();

  // Auto-persist custom giving type to church settings if not already present
  if (church && normalizedGivingType && !STANDARD_GIVING_TYPES.includes(normalizedGivingType)) {
    const existingCustom = church.settings?.customGivingTypes || [];
    if (!existingCustom.includes(normalizedGivingType)) {
      const updatedCustom = [...existingCustom, normalizedGivingType];
      const updatedSettings = {
        ...church.settings,
        customGivingTypes: updatedCustom,
      };
      db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
      db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);
    }
  }

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
    givingType: normalizedGivingType,
    date: data.date || now.slice(0, 10),
    paymentMethod: data.paymentMethod || 'Cash',
    referenceNumber: data.referenceNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
    campaignOrProject: data.campaignOrProject,
    receiptNumber,
    notes: data.notes,
    smsSent: false,
    recordedBy: data.recordedBy || req.user?.fullName || 'Finance Officer',
    createdAt: now,
  };

  db.update('giving', list => [newGiving, ...list]);
  await db.saveDoc('giving', id, newGiving).catch(console.error);

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

// ================= EXPENSE CATEGORIES ================= //
const STANDARD_EXPENSE_CATEGORIES = [
  'Utilities (Electricity/Water)',
  'Media & Sound Equipment',
  'Guest Minister Honorarium',
  'Benevolence & Welfare Support',
  'Sanctuary Cleaning & Maintenance',
  'Transport & Fuel',
  'Administrative Printing & Supplies',
];

router.get('/expense-categories', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const church = db.get('churches').find(c => c.id === churchId);
  const customCategories: string[] = church?.settings?.customExpenseCategories || [];
  const allCategories = Array.from(new Set([...STANDARD_EXPENSE_CATEGORIES, ...customCategories]));
  res.json({
    standardCategories: STANDARD_EXPENSE_CATEGORIES,
    customCategories,
    allCategories,
  });
});

router.post('/expense-categories', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { name } = req.body;
  const trimmed = (name || '').trim();
  if (!trimmed) {
    res.status(400).json({ error: 'Expense category name is required.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found.' });
    return;
  }

  const existingCustom: string[] = church.settings?.customExpenseCategories || [];
  if (STANDARD_EXPENSE_CATEGORIES.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    res.status(400).json({ error: `"${trimmed}" is already a standard expense category.` });
    return;
  }

  const updatedCustom = existingCustom.some(c => c.toLowerCase() === trimmed.toLowerCase())
    ? existingCustom
    : [...existingCustom, trimmed];

  const updatedSettings = {
    ...church.settings,
    customExpenseCategories: updatedCustom,
  };

  db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
  await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);

  res.status(201).json({
    message: `Custom expense category "${trimmed}" added successfully.`,
    customCategories: updatedCustom,
    allCategories: Array.from(new Set([...STANDARD_EXPENSE_CATEGORIES, ...updatedCustom])),
  });
});

router.delete('/expense-categories/:name', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const nameToDelete = decodeURIComponent(req.params.name).trim();

  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found.' });
    return;
  }

  const existingCustom: string[] = church.settings?.customExpenseCategories || [];
  const updatedCustom = existingCustom.filter(c => c.toLowerCase() !== nameToDelete.toLowerCase());

  const updatedSettings = {
    ...church.settings,
    customExpenseCategories: updatedCustom,
  };

  db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
  await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);

  res.json({
    message: `Expense category "${nameToDelete}" removed.`,
    customCategories: updatedCustom,
    allCategories: Array.from(new Set([...STANDARD_EXPENSE_CATEGORIES, ...updatedCustom])),
  });
});

router.get('/finance/expenses', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const expenses = db.get('expenses').filter(e => e.churchId === churchId);
  res.json(expenses);
});

router.post('/finance/expenses', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { category, customCategory, isCustom, amount, payee, paymentMethod, description, date } = req.body;

  const actualCategory = (customCategory || category || '').trim();
  if (!actualCategory || !amount || !payee) {
    res.status(400).json({ error: 'Category, amount, and payee are required.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // If custom or not in standard categories, auto-save to church customExpenseCategories
  const isCustomCategory = !!isCustom || !STANDARD_EXPENSE_CATEGORIES.some(sc => sc.toLowerCase() === actualCategory.toLowerCase());
  if (isCustomCategory && church) {
    const existing = church.settings?.customExpenseCategories || [];
    if (!existing.some(c => c.toLowerCase() === actualCategory.toLowerCase()) &&
        !STANDARD_EXPENSE_CATEGORIES.some(c => c.toLowerCase() === actualCategory.toLowerCase())) {
      const updatedCustom = [...existing, actualCategory];
      const updatedSettings = { ...church.settings, customExpenseCategories: updatedCustom };
      db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
      await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);
    }
  }

  const newExpense: ExpenseRecord = {
    id,
    churchId,
    category: actualCategory,
    customCategory: isCustomCategory ? actualCategory : undefined,
    isCustom: isCustomCategory,
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
  await db.saveDoc('expenses', id, newExpense).catch(console.error);
  res.status(201).json(newExpense);
});

router.delete('/finance/expenses/:id', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;
  db.update('expenses', list => list.filter(e => !(e.id === id && e.churchId === churchId)));
  await db.deleteDoc('expenses', id).catch(console.error);
  res.json({ message: 'Expense record deleted.' });
});

// ================= PASTORAL CARE (CONFIDENTIAL) ================= //
const STANDARD_PASTORAL_CATEGORIES = [
  'Pastoral Counseling',
  'Hospital Visitation',
  'Home Visitation',
  'Bereavement Support',
  'Welfare Assistance',
  'Pre-marital Counseling',
  'Prayer Request',
];

router.get('/pastoral-categories', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const church = db.get('churches').find(c => c.id === churchId);
  const customCategories: string[] = church?.settings?.customPastoralCategories || [];
  res.json({
    standardCategories: STANDARD_PASTORAL_CATEGORIES,
    customCategories,
    allCategories: Array.from(new Set([...STANDARD_PASTORAL_CATEGORIES, ...customCategories])),
  });
});

router.post('/pastoral-categories', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { name } = req.body;
  const trimmed = (name || '').trim();
  if (!trimmed) {
    res.status(400).json({ error: 'Pastoral category name is required.' });
    return;
  }
  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found.' });
    return;
  }
  const existing = church.settings?.customPastoralCategories || [];
  const updated = existing.includes(trimmed) ? existing : [...existing, trimmed];
  const updatedSettings = { ...church.settings, customPastoralCategories: updated };
  db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
  await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);
  res.status(201).json({ customCategories: updated });
});

router.get('/pastoral', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const cases = db.get('pastoralCases').filter(p => p.churchId === churchId);
  res.json(cases);
});

router.post('/pastoral', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { caseType, customCaseType, isCustom, memberNameOrSubject, phone, assignedPastor, priority, confidentialNotes, followUpDate } = req.body;

  const actualType = (customCaseType || caseType || '').trim();
  if (!actualType || !memberNameOrSubject) {
    res.status(400).json({ error: 'Case type and subject name are required.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  const isCustomType = !!isCustom || !STANDARD_PASTORAL_CATEGORIES.some(sc => sc.toLowerCase() === actualType.toLowerCase());
  if (isCustomType && church) {
    const existing = church.settings?.customPastoralCategories || [];
    if (!existing.some(c => c.toLowerCase() === actualType.toLowerCase()) &&
        !STANDARD_PASTORAL_CATEGORIES.some(c => c.toLowerCase() === actualType.toLowerCase())) {
      const updated = [...existing, actualType];
      const updatedSettings = { ...church.settings, customPastoralCategories: updated };
      db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
      await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);
    }
  }

  const id = `pas_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newCase: PastoralCase = {
    id,
    churchId,
    caseType: actualType,
    customCaseType: isCustomType ? actualType : undefined,
    isCustom: isCustomType,
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
  await db.saveDoc('pastoralCases', id, newCase).catch(console.error);
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
const STANDARD_DEPARTMENT_CATEGORIES = [
  'Department',
  'Ministry',
  'Cell Group / Fellowship',
  'Committee',
];

router.get('/department-categories', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const church = db.get('churches').find(c => c.id === churchId);
  const customCategories: string[] = church?.settings?.customDepartmentCategories || [];
  res.json({
    standardCategories: STANDARD_DEPARTMENT_CATEGORIES,
    customCategories,
    allCategories: Array.from(new Set([...STANDARD_DEPARTMENT_CATEGORIES, ...customCategories])),
  });
});

router.post('/department-categories', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { name } = req.body;
  const trimmed = (name || '').trim();
  if (!trimmed) {
    res.status(400).json({ error: 'Department category name is required.' });
    return;
  }
  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found.' });
    return;
  }
  const existing = church.settings?.customDepartmentCategories || [];
  const updated = existing.includes(trimmed) ? existing : [...existing, trimmed];
  const updatedSettings = { ...church.settings, customDepartmentCategories: updated };
  db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
  await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);
  res.status(201).json({ customCategories: updated });
});

router.get('/departments', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const departments = db.get('departments').filter(d => d.churchId === churchId);
  res.json(departments);
});

router.post('/departments', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { name, type, category, customCategory, isCustom, leaderName, leaderPhone, meetingDay, meetingTime, meetingLocation, description } = req.body;

  const actualType = (customCategory || category || type || 'department').trim();
  if (!name) {
    res.status(400).json({ error: 'Department name is required.' });
    return;
  }

  const church = db.get('churches').find(c => c.id === churchId);
  const isCustomType = !!isCustom || !STANDARD_DEPARTMENT_CATEGORIES.some(sc => sc.toLowerCase() === actualType.toLowerCase());
  if (isCustomType && church) {
    const existing = church.settings?.customDepartmentCategories || [];
    if (!existing.some(c => c.toLowerCase() === actualType.toLowerCase()) &&
        !STANDARD_DEPARTMENT_CATEGORIES.some(c => c.toLowerCase() === actualType.toLowerCase())) {
      const updated = [...existing, actualType];
      const updatedSettings = { ...church.settings, customDepartmentCategories: updated };
      db.update('churches', list => list.map(c => c.id === churchId ? { ...c, settings: updatedSettings as any } : c));
      await db.saveDoc('churches', churchId, { ...church, settings: updatedSettings }).catch(console.error);
    }
  }

  const id = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newDept: DepartmentOrGroup = {
    id,
    churchId,
    name: name.trim(),
    type: actualType,
    category: actualType,
    customCategory: isCustomType ? actualType : undefined,
    isCustom: isCustomType,
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
  await db.saveDoc('departments', id, newDept).catch(console.error);
  res.status(201).json(newDept);
});

router.delete('/departments/:id', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const { id } = req.params;
  db.update('departments', list => list.filter(d => !(d.id === id && d.churchId === churchId)));
  await db.deleteDoc('departments', id).catch(console.error);
  res.json({ message: 'Department removed.' });
});

// ================= NOTIFICATIONS BELL & REALTIME FEED ================= //
const readNotificationSet = new Set<string>();
const dismissedNotificationSet = new Set<string>();

router.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const notifications: any[] = [];

  // 1. Recent Givings (last 8)
  const givings = db.get('giving')
    .filter(g => g.churchId === churchId)
    .slice(0, 8);
  givings.forEach(g => {
    const id = `notif_giv_${g.id}`;
    if (!dismissedNotificationSet.has(id)) {
      notifications.push({
        id,
        churchId,
        title: `Contribution: ${g.givingType}`,
        message: `Received ${g.currency || 'GH₵'} ${(Number(g.amount) || 0).toLocaleString()} from ${g.memberName}. (Receipt: ${g.receiptNumber || g.referenceNumber || 'Cash'})`,
        category: 'FINANCE',
        severity: 'info',
        isRead: readNotificationSet.has(id),
        createdAt: g.createdAt,
        linkTab: 'giving',
      });
    }
  });

  // 2. Recent Expenses (last 8)
  const expenses = db.get('expenses')
    .filter(e => e.churchId === churchId)
    .slice(0, 8);
  expenses.forEach(e => {
    const id = `notif_exp_${e.id}`;
    if (!dismissedNotificationSet.has(id)) {
      notifications.push({
        id,
        churchId,
        title: `Expense: ${e.category}`,
        message: `Disbursed ${e.currency || 'GH₵'} ${(Number(e.amount) || 0).toLocaleString()} to ${e.payee} (${e.paymentMethod}).`,
        category: 'FINANCE',
        severity: 'info',
        isRead: readNotificationSet.has(id),
        createdAt: e.createdAt,
        linkTab: 'giving',
      });
    }
  });

  // 3. Recent SMS Dispatches (last 8)
  const smsList = db.get('smsMessages')
    .filter(s => s.churchId === churchId)
    .slice(0, 8);
  smsList.forEach(s => {
    const id = `notif_sms_${s.id}`;
    if (!dismissedNotificationSet.has(id)) {
      const isFailed = s.status === 'Failed';
      notifications.push({
        id,
        churchId,
        title: `SMS Dispatch: ${s.notificationType || 'Announcement'}`,
        message: `Dispatched to ${s.recipientName || s.phone}. Status: ${s.status}.`,
        category: 'SMS',
        severity: isFailed ? 'high' : 'info',
        isRead: readNotificationSet.has(id),
        createdAt: s.createdAt,
        linkTab: 'sms',
      });
    }
  });

  // 4. Upcoming Church Events (next 6)
  const events = db.get('events')
    .filter(ev => ev.churchId === churchId && ev.status !== 'Completed')
    .slice(0, 6);
  events.forEach(ev => {
    const id = `notif_evt_${ev.id}`;
    if (!dismissedNotificationSet.has(id)) {
      notifications.push({
        id,
        churchId,
        title: `Event: ${ev.title}`,
        message: `${ev.category || 'Event'} scheduled for ${ev.date} at ${ev.startTime || '06:00 PM'} (${ev.venue}).`,
        category: 'EVENT',
        severity: 'info',
        isRead: readNotificationSet.has(id),
        createdAt: ev.createdAt,
        linkTab: 'events',
      });
    }
  });

  // 5. Recent Visitors (last 6)
  const visitors = db.get('visitors')
    .filter(v => v.churchId === churchId)
    .slice(0, 6);
  visitors.forEach(v => {
    const id = `notif_vis_${v.id}`;
    if (!dismissedNotificationSet.has(id)) {
      notifications.push({
        id,
        churchId,
        title: `New Guest: ${v.fullName}`,
        message: `First-time visitor recorded for ${v.serviceAttended} (${v.followUpStatus}).`,
        category: 'MEMBER',
        severity: 'info',
        isRead: readNotificationSet.has(id),
        createdAt: v.createdAt,
        linkTab: 'visitors',
      });
    }
  });

  // 6. System Notifications
  const sysNotifs = db.get('systemNotifications') || [];
  sysNotifs.forEach(sn => {
    const id = `notif_sys_${sn.id}`;
    if (!dismissedNotificationSet.has(id)) {
      notifications.push({
        id,
        title: `System Alert: ${sn.title}`,
        message: sn.message,
        category: 'SYSTEM',
        severity: sn.severity || 'info',
        isRead: sn.isRead || readNotificationSet.has(id),
        createdAt: sn.createdAt,
      });
    }
  });

  // Sort newest first
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter(n => !n.isRead).length;
  res.json({
    notifications,
    unreadCount,
  });
});

router.post('/notifications/mark-read', (req: AuthenticatedRequest, res: Response) => {
  const { id, all } = req.body;
  if (all) {
    const churchId = getChurchId(req);
    db.get('giving').filter(g => g.churchId === churchId).forEach(g => readNotificationSet.add(`notif_giv_${g.id}`));
    db.get('expenses').filter(e => e.churchId === churchId).forEach(e => readNotificationSet.add(`notif_exp_${e.id}`));
    db.get('smsMessages').filter(s => s.churchId === churchId).forEach(s => readNotificationSet.add(`notif_sms_${s.id}`));
    db.get('events').filter(ev => ev.churchId === churchId).forEach(ev => readNotificationSet.add(`notif_evt_${ev.id}`));
    db.get('visitors').filter(v => v.churchId === churchId).forEach(v => readNotificationSet.add(`notif_vis_${v.id}`));
    (db.get('systemNotifications') || []).forEach(sn => readNotificationSet.add(`notif_sys_${sn.id}`));
  } else if (id) {
    readNotificationSet.add(id);
  }
  res.json({ success: true, message: 'Notification status updated.' });
});

router.delete('/notifications/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (id) {
    dismissedNotificationSet.add(id);
  }
  res.json({ success: true, message: 'Notification dismissed.' });
});

// ================= EVENTS & CALENDAR ================= //
router.get('/events', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const events = db.get('events').filter(e => e.churchId === churchId);
  res.json(events);
});

router.post('/events', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const {
    title,
    category,
    customCategory,
    isCustom,
    date,
    startTime,
    endTime,
    venue,
    description,
    organizer,
    guestSpeaker,
    targetAudience,
    expectedAttendance,
  } = req.body;

  if (!title || !date) {
    res.status(400).json({ error: 'Event title and date are required.' });
    return;
  }

  const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const effectiveCategory = (isCustom && customCategory ? customCategory : (category || 'Program')).trim();

  const newEvent: ChurchEvent = {
    id,
    churchId,
    title: title.trim(),
    category: effectiveCategory,
    customCategory: customCategory ? customCategory.trim() : undefined,
    isCustom: !!isCustom || !!customCategory,
    date,
    startTime: startTime || '09:00 AM',
    endTime: endTime || '12:00 PM',
    venue: venue || 'Main Sanctuary',
    guestSpeaker: guestSpeaker?.trim() || '',
    targetAudience: targetAudience || 'All Congregation',
    expectedAttendance: expectedAttendance ? parseInt(expectedAttendance, 10) : undefined,
    description: description || '',
    organizer: organizer || req.user?.fullName || 'Church Leadership',
    reminderScheduled: false,
    status: 'Upcoming',
    createdAt: new Date().toISOString(),
  };

  db.update('events', list => [newEvent, ...list]);
  await db.saveDoc('events', id, newEvent).catch(console.error);
  res.status(201).json(newEvent);
});

router.put('/events/:id', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const eventId = req.params.id;
  const event = db.get('events').find(e => e.id === eventId && e.churchId === churchId);

  if (!event) {
    res.status(404).json({ error: 'Event record not found.' });
    return;
  }

  const updates = req.body;
  const updatedEvent: ChurchEvent = {
    ...event,
    ...updates,
    id: event.id,
    churchId: event.churchId,
  };

  db.update('events', list => list.map(e => e.id === eventId ? updatedEvent : e));
  await db.saveDoc('events', eventId, updatedEvent).catch(console.error);
  res.json(updatedEvent);
});

router.delete('/events/:id', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const eventId = req.params.id;
  const event = db.get('events').find(e => e.id === eventId && e.churchId === churchId);

  if (!event) {
    res.status(404).json({ error: 'Event record not found.' });
    return;
  }

  db.update('events', list => list.filter(e => e.id !== eventId));
  await db.deleteDoc('events', eventId).catch(console.error);
  res.json({ success: true, message: `Event "${event.title}" has been deleted.` });
});

// ================= SMS COMMUNICATION (CHURCH TENANT) ================= //
router.get('/sms/messages', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const messages = db.get('smsMessages').filter(s => s.churchId === churchId);
  res.json(messages);
});

// Dispatch single or Bulk SMS (Robust recipient resolution and normalization)
async function handleSmsDispatchCore(req: AuthenticatedRequest, res: Response) {
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

  // Gather candidate member IDs from all possible parameter formats
  const candidateMemberIds: string[] = [];
  if (Array.isArray(req.body.memberIds)) {
    candidateMemberIds.push(...req.body.memberIds);
  }
  if (Array.isArray(req.body.selectedMemberIds)) {
    candidateMemberIds.push(...req.body.selectedMemberIds);
  }
  if (typeof req.body.memberId === 'string' && req.body.memberId.trim()) {
    candidateMemberIds.push(req.body.memberId.trim());
  }
  if (typeof req.body.recipientMemberId === 'string' && req.body.recipientMemberId.trim()) {
    candidateMemberIds.push(req.body.recipientMemberId.trim());
  }
  if (req.body.member && typeof req.body.member.id === 'string' && req.body.member.id.trim()) {
    candidateMemberIds.push(req.body.member.id.trim());
  }
  if (Array.isArray(recipients)) {
    for (const r of recipients) {
      if (typeof r === 'string' && members.some(m => m.id === r)) {
        candidateMemberIds.push(r);
      } else if (r && typeof r === 'object') {
        if (typeof r.memberId === 'string' && r.memberId.trim()) {
          candidateMemberIds.push(r.memberId.trim());
        } else if (typeof r.id === 'string' && members.some(m => m.id === r.id)) {
          candidateMemberIds.push(r.id.trim());
        }
      }
    }
  }

  const uniqueCandidateMemberIds = Array.from(new Set(candidateMemberIds.filter(Boolean)));

  // If specific members are targeted, or if recipientType indicates selected/single member
  const isMemberTargeted =
    recipientType === 'SELECTED_MEMBERS' ||
    recipientType === 'MEMBER' ||
    recipientType === 'SINGLE_MEMBER' ||
    (uniqueCandidateMemberIds.length > 0 &&
      (!recipientType || recipientType === 'CUSTOM_LIST' || recipientType === 'SELECTED_MEMBERS'));

  if (isMemberTargeted && uniqueCandidateMemberIds.length > 0) {
    // If a single member is specifically targeted
    if (uniqueCandidateMemberIds.length === 1) {
      const targetMemberId = uniqueCandidateMemberIds[0];
      const member = members.find(m => m.id === targetMemberId);
      if (!member) {
        if (!req.body.phone) {
          res.status(404).json({ error: 'Selected member record was not found in the church database.' });
          return;
        }
        const norm = normalizePhoneNumber(req.body.phone);
        if (!norm.isValid) {
          res.status(400).json({
            error: `Provided phone number (${req.body.phone}) is invalid: ${norm.error || 'Invalid phone format'}.`,
          });
          return;
        }
        targetRecipients.push({
          name: req.body.recipientName || req.body.name || 'Member',
          phone: norm.normalized,
          memberId: targetMemberId,
        });
      } else {
        const rawPhone = (
          req.body.phone ||
          member.phone ||
          (member as any).normalizedPhone ||
          (member as any).phoneNumber ||
          (member as any).mobile ||
          ''
        ).trim();
        if (!rawPhone) {
          res.status(400).json({
            error: 'This member does not have a registered phone number.',
            memberId: member.id,
            memberName: member.fullName,
          });
          return;
        }
        const norm = normalizePhoneNumber(rawPhone);
        if (!norm.isValid) {
          res.status(400).json({
            error: `This member's registered phone number (${rawPhone}) is invalid: ${norm.error || 'Invalid phone format'}.`,
            memberId: member.id,
            memberName: member.fullName,
          });
          return;
        }
        targetRecipients.push({
          name: member.fullName,
          phone: norm.normalized,
          memberId: member.id,
        });
      }
    } else {
      // Multiple specific members targeted
      let withPhone = 0;
      for (const id of uniqueCandidateMemberIds) {
        const mem = members.find(m => m.id === id);
        const rObj = Array.isArray(recipients) ? recipients.find((r: any) => r && (r.memberId === id || r.id === id)) : null;
        const rawPhone = (
          (rObj && (rObj.phone || rObj.normalizedPhone)) ||
          mem?.phone ||
          (mem as any)?.normalizedPhone ||
          (mem as any)?.phoneNumber ||
          (mem as any)?.mobile ||
          ''
        ).trim();

        if (rawPhone) {
          withPhone++;
          targetRecipients.push({
            name: mem?.fullName || (rObj && rObj.name) || 'Member',
            phone: rawPhone,
            memberId: id,
          });
        }
      }
      if (withPhone === 0 && !req.body.phone && !Array.isArray(recipients)) {
        res.status(400).json({
          error: 'None of the selected members have a registered phone number.',
        });
        return;
      }
    }
  } else if (recipientType === 'ALL_MEMBERS') {
    targetRecipients = members.map(m => ({ name: m.fullName, phone: m.phone || (m as any).normalizedPhone, memberId: m.id }));
  } else if (recipientType === 'ACTIVE_MEMBERS') {
    targetRecipients = members.filter(m => m.membershipStatus === 'Active').map(m => ({ name: m.fullName, phone: m.phone || (m as any).normalizedPhone, memberId: m.id }));
  } else if (recipientType === 'PARENTS') {
    const parents = members.filter(m => m.familyRole === 'Head' || m.familyRole === 'Spouse' || m.maritalStatus === 'Married');
    targetRecipients = (parents.length > 0 ? parents : members).map(m => ({ name: m.fullName, phone: m.phone || (m as any).normalizedPhone, memberId: m.id }));
  } else if (recipientType === 'TEACHERS') {
    const depts = db.get('departments').filter(d => d.churchId === churchId);
    const teacherDeptIds = depts.filter(d => /children|sunday|teacher|youth|education|class/i.test(d.name)).map(d => d.id);
    const teachers = members.filter(m => m.departmentIds.some(id => teacherDeptIds.includes(id)));
    targetRecipients = (teachers.length > 0 ? teachers : members.slice(0, 10)).map(m => ({ name: m.fullName, phone: m.phone || (m as any).normalizedPhone, memberId: m.id }));
  } else if (recipientType === 'STAFF') {
    const staffFromUsers = users.map(u => ({ name: u.fullName, phone: u.phone || '' })).filter(u => u.phone.length > 0);
    const staffFromMembers = members.filter(m => /pastor|minister|leader|elder|deacon|worker|staff/i.test(m.occupation || ''));
    const combined = [...staffFromUsers, ...staffFromMembers.map(m => ({ name: m.fullName, phone: m.phone || (m as any).normalizedPhone }))];
    targetRecipients = combined.length > 0 ? combined : members.slice(0, 5).map(m => ({ name: m.fullName, phone: m.phone || (m as any).normalizedPhone, memberId: m.id }));
  } else if (recipientType === 'VISITORS') {
    targetRecipients = visitors.map(v => ({ name: v.fullName, phone: v.phone }));
  } else if (recipientType === 'DEPARTMENT' && req.body.departmentId) {
    targetRecipients = members.filter(m => m.departmentIds.includes(req.body.departmentId)).map(m => ({ name: m.fullName, phone: m.phone || (m as any).normalizedPhone, memberId: m.id }));
  } else if (recipientType === 'CUSTOM' || recipientType === 'RAW_NUMBERS' || customNumbers) {
    const rawInput = customNumbers || req.body.numbers || req.body.phone || req.body.customPhone || recipients;
    let rawList: string[] = [];
    if (typeof rawInput === 'string') {
      rawList = rawInput.split(/[\n,;]/).map(n => n.trim()).filter(n => n.length > 0);
    } else if (Array.isArray(rawInput)) {
      rawList = rawInput.map(n => (typeof n === 'string' ? n.trim() : (n?.phone || ''))).filter(Boolean);
    }
    targetRecipients = rawList.map((p, idx) => ({ name: `Contact ${idx + 1}`, phone: p }));
  } else if (recipientType === 'CUSTOM_LIST' && Array.isArray(recipients)) {
    for (const r of recipients) {
      if (typeof r === 'string') {
        const mem = members.find(m => m.id === r);
        if (mem) {
          const rawPhone = (mem.phone || (mem as any).normalizedPhone || '').trim();
          if (rawPhone) targetRecipients.push({ name: mem.fullName, phone: rawPhone, memberId: mem.id });
        } else {
          targetRecipients.push({ name: 'Recipient', phone: r });
        }
      } else if (r && typeof r === 'object') {
        const mem = r.memberId ? members.find(m => m.id === r.memberId) : null;
        const phone = (r.phone || mem?.phone || (mem as any)?.normalizedPhone || '').trim();
        if (phone) {
          targetRecipients.push({ name: r.name || mem?.fullName || 'Recipient', phone, memberId: r.memberId || mem?.id });
        }
      }
    }
  } else if (req.body.phone) {
    targetRecipients = [{ name: req.body.name || req.body.recipientName || 'Recipient', phone: req.body.phone, memberId: req.body.memberId }];
  }

  // Deduplicate recipients: ensure each member and each normalized phone receives at most one SMS
  const seenMemberIds = new Set<string>();
  const seenPhoneKeys = new Set<string>();
  const deduplicatedRecipients: Array<{ name: string; phone: string; memberId?: string }> = [];

  for (const item of targetRecipients) {
    const rawPhone = (item.phone || '').trim();
    if (!rawPhone) continue;

    const norm = normalizePhoneNumber(rawPhone);
    const phoneKey = norm.isValid ? norm.normalized : rawPhone.replace(/[\s\-\(\)]/g, '');

    if (item.memberId && seenMemberIds.has(item.memberId)) {
      continue; // Prevent duplicate recipient when same member is selected more than once
    }
    if (phoneKey && seenPhoneKeys.has(phoneKey)) {
      continue; // Prevent duplicate SMS to same mobile handset
    }

    if (item.memberId) seenMemberIds.add(item.memberId);
    if (phoneKey) seenPhoneKeys.add(phoneKey);

    deduplicatedRecipients.push({
      name: item.name,
      phone: norm.isValid ? norm.normalized : rawPhone,
      memberId: item.memberId,
    });
  }
  targetRecipients = deduplicatedRecipients;

  if (targetRecipients.length === 0) {
    if (uniqueCandidateMemberIds.length === 1) {
      res.status(400).json({ error: 'This member does not have a registered phone number.' });
      return;
    }
    if (uniqueCandidateMemberIds.length > 1) {
      res.status(400).json({ error: 'None of the selected members have a registered phone number.' });
      return;
    }
    res.status(400).json({ error: 'No valid recipients selected or resolved for this dispatch.' });
    return;
  }

  // Generate batch transaction token to prevent accidental duplicate dispatch if button clicked twice
  const batchToken = req.body.clientBatchId || `batch_${Date.now()}`;
  const church = db.get('churches').find(c => c.id === churchId);
  const churchName = church?.name || 'Church';

  let submitted = 0;
  let delivered = 0;
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
        failureReason: norm.error || 'Unable to Send — No Valid Phone Number',
      });
      continue;
    }

    const recipientPersonalizedMessage = message.trim()
      .replace(/\[Member Name\]/gi, item.name)
      .replace(/\[Church Name\]/gi, churchName);

    const idempotencyKey = `sms_${churchId}_${batchToken}_${norm.normalized}`;
    try {
      const resSend = await SmsService.sendSms({
        churchId,
        memberId: item.memberId,
        recipientName: item.name,
        phone: norm.normalized,
        message: recipientPersonalizedMessage,
        notificationType: notificationType || (recipientType === 'SELECTED_MEMBERS' ? 'MEMBER_UPDATE' : 'BULK_ANNOUNCEMENT'),
        idempotencyKey,
      });

      if (resSend.success) {
        if (resSend.smsMessage?.status === 'Delivered') {
          delivered++;
        } else {
          submitted++;
        }
      } else {
        failed++;
      }
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

  const primaryFailureReason = results.find(r => r.failureReason)?.failureReason;
  const isOverallSuccess = (submitted + delivered) > 0;

  // CRITICAL: Do NOT report API acceptance as delivered.
  // Report submitted (pending delivery) vs confirmed delivered vs failed.
  const summaryMessage = isOverallSuccess
    ? (delivered > 0
        ? `SMS dispatch completed: ${submitted} submitted (pending carrier delivery), ${delivered} confirmed delivered, ${failed} failed (${skippedNoPhone} without valid phone numbers).`
        : `SMS submitted to gateway: ${submitted} submitted (pending carrier delivery), 0 delivered, ${failed} failed (${skippedNoPhone} without valid phone numbers).`)
    : `SMS dispatch failed: 0 submitted, ${failed} failed (${skippedNoPhone} without valid phone numbers). ${primaryFailureReason || ''}`.trim();

  res.json({
    success: isOverallSuccess,
    totalTargeted: targetRecipients.length,
    sent: submitted + delivered,
    submitted,
    pending: submitted,
    delivered,
    failed,
    skippedNoPhone,
    results: results.slice(0, 50),
    failureReason: primaryFailureReason,
    remainingCredits: church?.smsCredits,
    message: summaryMessage,
  });
}

router.post('/sms/send', handleSmsDispatchCore);

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
    "Dear [Member Name], this is a friendly reminder regarding your church giving. Thank you for your continued faithfulness and support.";

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
  // Return messages with full delivery status, tracking timestamps, and provider metadata
  const sanitized = messages.map(m => ({
    id: m.id,
    recipientName: m.recipientName,
    phone: m.phone,
    recipientPhone: m.recipientPhone || m.normalizedPhone || m.phone,
    normalizedPhone: m.normalizedPhone,
    recipientNetwork: m.recipientNetwork,
    senderName: m.senderName,
    message: m.message,
    notificationType: m.notificationType,
    status: m.status,
    failureReason: m.failureReason,
    providerMessageId: m.providerMessageId,
    arkeselMessageId: m.arkeselMessageId,
    gatewayResponse: m.gatewayResponse,
    providerResponse: m.providerResponse,
    unitsDeducted: m.unitsDeducted,
    relatedReceiptNumber: m.relatedReceiptNumber,
    relatedContributionId: m.relatedContributionId,
    submittedAt: m.submittedAt || m.sentAt || m.createdAt,
    deliveredAt: m.deliveredAt,
    failedAt: m.failedAt,
    sentAt: m.sentAt || m.createdAt,
    createdAt: m.createdAt,
  }));
  res.json(sanitized);
});

// Check status of a single message with Arkesel Gateway
router.all(['/sms/:id/status', '/communication/sms/:id/status'], async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const messageId = req.params.id;
  try {
    const result = await SmsService.checkSingleMessageStatus(messageId, churchId);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Status check failed' });
  }
});

// Reconcile pending/submitted SMS delivery statuses with Arkesel Gateway
router.post(['/sms/reconcile', '/communication/sms-reconcile'], async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  try {
    const result = await SmsService.reconcilePendingMessages(churchId);
    res.json({
      success: true,
      message: `Reconciliation checked ${result.checked} pending SMS message(s), updated ${result.updated} delivery status(es).`,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Status reconciliation failed' });
  }
});

router.post('/communication/send-sms', handleSmsDispatchCore);

router.post('/communication/tithe-reminder', async (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const church = db.get('churches').find(c => c.id === churchId);
  if (!church) {
    res.status(404).json({ error: 'Church not found' });
    return;
  }

  const members = db.get('members').filter(m => m.churchId === churchId && m.membershipStatus === 'Active');
  const template = req.body.template || church.settings.titheReminderTemplate ||
    "Dear [Member Name], this is a friendly reminder regarding your church giving. Thank you for your continued faithfulness and support.";

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

router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
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

  // Prevent church admins from modifying Super-Admin only fields (Requirement 1 & 7)
  const sanitizedBasicInfo = { ...(basicInfo || {}) };
  delete sanitizedBasicInfo.smsCredits;
  delete sanitizedBasicInfo.smsAllocatedUnits;
  delete sanitizedBasicInfo.smsUnitsUsed;
  delete sanitizedBasicInfo.smsPricePerUnit;
  delete sanitizedBasicInfo.smsStatus;

  let updatedChurchRecord = church;
  db.update('churches', list =>
    list.map(c => {
      if (c.id === churchId) {
        updatedChurchRecord = {
          ...c,
          ...sanitizedBasicInfo,
          settings: {
            ...c.settings,
            ...(settings || {}),
          },
          updatedAt: new Date().toISOString(),
        };
        return updatedChurchRecord;
      }
      return c;
    })
  );

  await db.saveDoc('churches', churchId, updatedChurchRecord).catch(console.error);

  res.json({ success: true, message: 'Church settings updated successfully.' });
});

// ================= CHURCH STAFF & CUSTOM ROLES (Requirements 7, 8, 9, 10) ================= //

// GET /api/church/staff - List all staff for this church
router.get('/staff', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  if (!churchId) {
    res.status(403).json({ error: 'Church ID not identified.' });
    return;
  }

  const users = db.get('users').filter(u => u.churchId === churchId);
  // Return staff without sensitive passwordHash
  const safeStaff = users.map(u => ({
    id: u.id,
    churchId: u.churchId,
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    phone: u.phone,
    role: u.role,
    customRoleTitle: u.customRoleTitle,
    permissions: (u.permissions && u.permissions.length > 0) ? u.permissions : getDefaultRolePermissions(u.role),
    status: u.status,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));

  res.json(safeStaff);
});

// POST /api/church/staff - Create new staff member
router.post('/staff', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  if (!churchId) {
    res.status(403).json({ error: 'Church ID not identified.' });
    return;
  }

  const { fullName, username, email, phone, role, customRoleTitle, permissions, password } = req.body;

  if (!fullName || !fullName.trim()) {
    res.status(400).json({ error: 'Staff member name is required.' });
    return;
  }

  if (!username || !username.trim()) {
    res.status(400).json({ error: 'Login username is required.' });
    return;
  }

  if (!password || password.length < 4) {
    res.status(400).json({ error: 'Login password is required and must be at least 4 characters.' });
    return;
  }

  if (!role) {
    res.status(400).json({ error: 'Assigned role is required.' });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const existingUser = db.get('users').find(u => u.username.toLowerCase() === cleanUsername);
  if (existingUser) {
    res.status(400).json({ error: `Username "${cleanUsername}" is already taken. Please choose a different username.` });
    return;
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    const existingEmail = db.get('users').find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      res.status(400).json({ error: `Email "${cleanEmail}" is already in use by another account.` });
      return;
    }
  }

  const assignedPermissions = Array.isArray(permissions) && permissions.length > 0
    ? permissions
    : getDefaultRolePermissions(role);

  const newStaffUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    churchId,
    fullName: fullName.trim(),
    username: cleanUsername,
    email: cleanEmail || `${cleanUsername}@church.local`,
    phone: (phone || '').trim(),
    role,
    customRoleTitle: (customRoleTitle || '').trim() || undefined,
    permissions: assignedPermissions,
    passwordHash: hashPassword(password),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  db.update('users', list => [...list, newStaffUser]);

  // Audit log
  db.update('auditLogs', logs => [
    {
      id: `aud_${Date.now()}`,
      churchId,
      userId: req.user?.id || 'admin',
      userName: req.user?.fullName || 'Administrator',
      action: 'STAFF_CREATED',
      details: `Created staff member ${newStaffUser.fullName} with role ${newStaffUser.customRoleTitle || newStaffUser.role} (username: ${newStaffUser.username}).`,
      timestamp: new Date().toISOString(),
    },
    ...logs,
  ]);

  const { passwordHash, ...safeUser } = newStaffUser;
  res.status(201).json({
    success: true,
    message: `Staff member ${newStaffUser.fullName} added successfully.`,
    staff: safeUser,
  });
});

// PUT /api/church/staff/:id - Update staff member
router.put('/staff/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const staffId = req.params.id;

  const targetUser = db.get('users').find(u => u.id === staffId && u.churchId === churchId);
  if (!targetUser) {
    res.status(404).json({ error: 'Staff member not found in this church.' });
    return;
  }

  const { fullName, email, phone, role, customRoleTitle, permissions, status, password } = req.body;

  let updatedPasswordHash = targetUser.passwordHash;
  if (password && password.trim().length >= 4) {
    updatedPasswordHash = hashPassword(password.trim());
  }

  const updatedPermissions = Array.isArray(permissions)
    ? permissions
    : role ? getDefaultRolePermissions(role) : targetUser.permissions;

  db.update('users', list =>
    list.map(u => {
      if (u.id === staffId && u.churchId === churchId) {
        return {
          ...u,
          fullName: fullName !== undefined ? fullName.trim() : u.fullName,
          email: email !== undefined ? email.trim() : u.email,
          phone: phone !== undefined ? phone.trim() : u.phone,
          role: role || u.role,
          customRoleTitle: customRoleTitle !== undefined ? (customRoleTitle.trim() || undefined) : u.customRoleTitle,
          permissions: updatedPermissions,
          status: status || u.status,
          passwordHash: updatedPasswordHash,
        };
      }
      return u;
    })
  );

  const updated = db.get('users').find(u => u.id === staffId);
  const { passwordHash, ...safeUpdated } = updated!;

  res.json({
    success: true,
    message: `Staff member ${safeUpdated.fullName} updated successfully.`,
    staff: safeUpdated,
  });
});

// DELETE /api/church/staff/:id - Remove staff member
router.delete('/staff/:id', (req: AuthenticatedRequest, res: Response) => {
  const churchId = getChurchId(req);
  const staffId = req.params.id;

  if (staffId === req.user?.id) {
    res.status(400).json({ error: 'You cannot remove your own active login account.' });
    return;
  }

  const targetUser = db.get('users').find(u => u.id === staffId && u.churchId === churchId);
  if (!targetUser) {
    res.status(404).json({ error: 'Staff member not found in this church.' });
    return;
  }

  if (targetUser.role === 'CHURCH_OWNER' || targetUser.role === 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Primary church owner account cannot be deleted.' });
    return;
  }

  db.update('users', list => list.filter(u => u.id !== staffId));

  res.json({ success: true, message: `Staff member ${targetUser.fullName} removed from church.` });
});

export default router;
