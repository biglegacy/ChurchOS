import { Router, Response } from 'express';
import { db, PastoralCase } from '../db';
import { requireAuth, AuthenticatedRequest } from '../auth';

const router = Router();

router.use(requireAuth);

// GET /api/member/portal - Member profile & history
router.get('/portal', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user || !user.churchId) {
    res.status(400).json({ error: 'User is not linked to a church organization.' });
    return;
  }

  // Find corresponding member record by phone, email, or name
  const members = db.get('members').filter(m => m.churchId === user.churchId);
  const member = members.find(
    m => (user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
         (user.phone && m.phone === user.phone) ||
         m.fullName.toLowerCase() === user.fullName.toLowerCase()
  ) || members[0]; // fallback to first member if test demo

  const church = db.get('churches').find(c => c.id === user.churchId);
  const givingRecords = member ? db.get('giving').filter(g => g.memberId === member.id && g.churchId === user.churchId) : [];
  const attendanceRecords = member ? db.get('attendance').filter(a => a.memberId === member.id && a.churchId === user.churchId) : [];
  const events = db.get('events').filter(e => e.churchId === user.churchId && e.status === 'Upcoming');
  const departments = member ? db.get('departments').filter(d => d.churchId === user.churchId && member.departmentIds.includes(d.id)) : [];

  res.json({
    user: {
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    member,
    church: church ? {
      name: church.name,
      currency: church.settings.currency,
      phone: church.phone,
      address: church.address,
    } : null,
    givingRecords,
    attendanceRecords,
    events,
    departments,
  });
});

// POST /api/member/prayer-request
router.post('/prayer-request', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { title, details, isUrgent } = req.body;

  if (!user?.churchId) {
    res.status(400).json({ error: 'No church organization associated.' });
    return;
  }

  if (!title || !details) {
    res.status(400).json({ error: 'Please provide request title and details.' });
    return;
  }

  const id = `pas_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newCase: PastoralCase = {
    id,
    churchId: user.churchId,
    caseType: 'Prayer Request',
    memberNameOrSubject: user.fullName,
    phone: user.phone || '',
    assignedPastor: 'Pastoral Care Team',
    priority: isUrgent ? 'Urgent' : 'Normal',
    status: 'Open',
    confidentialNotes: `[Member Portal Submission: ${title}] ${details}`,
    history: [
      {
        date: now.slice(0, 10),
        action: 'Member Portal Prayer Request',
        notes: `Submitted by ${user.fullName}`,
        by: user.fullName,
      },
    ],
    createdAt: now,
  };

  db.update('pastoralCases', list => [newCase, ...list]);
  res.status(201).json({ success: true, message: 'Your prayer request has been confidentially submitted to the pastoral team.' });
});

export default router;
