import { db, Church, Member, SmsMessage } from './db';
import { SmsService, deriveSenderIdFromChurchName, normalizePhoneNumber } from './smsService';

export const DEFAULT_BIRTHDAY_SMS_TEMPLATE =
  "Happy Birthday, [Member Name]! 🎉 We celebrate the grace and goodness of God upon your life today. May your new year be crowned with divine favour, joy, and peace! Have a glorious celebration. 🎂";

/**
 * Resolves the local date string (YYYY-MM-DD), month (1-12), and day (1-31)
 * based on a specific IANA timezone, church country, or UTC.
 */
export function getLocalDateForTimezone(tz?: string, country?: string): {
  dateStr: string;
  year: number;
  month: number;
  day: number;
  timeZoneUsed: string;
} {
  let timeZone = tz?.trim();

  // If no timezone provided, infer from church country
  if (!timeZone && country) {
    const c = country.toLowerCase().trim();
    if (c.includes('ghana')) timeZone = 'Africa/Accra';
    else if (c.includes('nigeria')) timeZone = 'Africa/Lagos';
    else if (c.includes('kenya')) timeZone = 'Africa/Nairobi';
    else if (c.includes('south africa')) timeZone = 'Africa/Johannesburg';
    else if (c.includes('united kingdom') || c === 'uk') timeZone = 'Europe/London';
    else if (c.includes('united states') || c === 'usa' || c === 'us') timeZone = 'America/New_York';
    else if (c.includes('canada')) timeZone = 'America/Toronto';
  }

  if (!timeZone) {
    timeZone = 'Africa/Accra'; // Default church operating timezone (GMT)
  }

  try {
    const now = new Date();
    // Use Intl.DateTimeFormat to reliably determine local parts in the specific timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const yPart = parts.find(p => p.type === 'year')?.value;
    const mPart = parts.find(p => p.type === 'month')?.value;
    const dPart = parts.find(p => p.type === 'day')?.value;

    const year = yPart ? parseInt(yPart, 10) : now.getUTCFullYear();
    const month = mPart ? parseInt(mPart, 10) : now.getUTCMonth() + 1;
    const day = dPart ? parseInt(dPart, 10) : now.getUTCDate();

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { dateStr, year, month, day, timeZoneUsed: timeZone };
  } catch (err) {
    // If timezone string was unrecognized, fall back gracefully to UTC
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { dateStr, year, month, day, timeZoneUsed: 'UTC' };
  }
}

export interface BirthdayProcessResult {
  churchId: string;
  churchName: string;
  localDate: string;
  timeZone: string;
  totalCelebrantsToday: number;
  alreadySent: number;
  sentNow: number;
  failed: number;
  skipped: number;
  skipReason?: string;
  details: Array<{
    memberId: string;
    memberName: string;
    phone: string;
    status: 'SENT' | 'ALREADY_SENT' | 'FAILED' | 'SKIPPED';
    reason?: string;
  }>;
}

/**
 * Processes automated birthday SMS for a single church.
 * Completely tenant-isolated.
 */
export async function processChurchBirthdays(
  church: Church,
  options?: { force?: boolean }
): Promise<BirthdayProcessResult> {
  const timeZone = church.settings?.timezone;
  const { dateStr, year, month, day, timeZoneUsed } = getLocalDateForTimezone(timeZone, church.country);

  const result: BirthdayProcessResult = {
    churchId: church.id,
    churchName: church.name,
    localDate: dateStr,
    timeZone: timeZoneUsed,
    totalCelebrantsToday: 0,
    alreadySent: 0,
    sentNow: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  // 1. Respect church status & SMS settings
  if (church.status && church.status !== 'ACTIVE') {
    result.skipReason = `Church is currently ${church.status}.`;
    return result;
  }

  if (church.features && church.features.sms === false) {
    result.skipReason = 'SMS module is not enabled for this church.';
    return result;
  }

  if (church.smsStatus === 'DISABLED') {
    result.skipReason = 'SMS messaging is disabled for this church by the administrator.';
    return result;
  }

  if (church.settings?.smsEnabled === false) {
    result.skipReason = 'SMS messaging is paused in church SMS settings.';
    return result;
  }

  if (church.settings?.birthdaySmsEnabled === false) {
    result.skipReason = 'Automatic Birthday SMS is turned off in church settings.';
    return result;
  }

  // 2. Fetch members strictly belonging to this church (Tenant isolation)
  const allMembers = db.get('members');
  const churchMembers = allMembers.filter(m => m.churchId === church.id);

  // 3. Find members whose birthday matches today's local date
  const celebrants: Member[] = [];
  for (const m of churchMembers) {
    if (!m.dateOfBirth) continue;
    const parts = m.dateOfBirth.split('-');
    let mMonth: number | undefined;
    let mDay: number | undefined;

    if (parts.length === 3) {
      mMonth = parseInt(parts[1], 10);
      mDay = parseInt(parts[2], 10);
    } else if (parts.length === 2) {
      mMonth = parseInt(parts[0], 10);
      mDay = parseInt(parts[1], 10);
    }

    if (mMonth === month && mDay === day) {
      celebrants.push(m);
    }
  }

  result.totalCelebrantsToday = celebrants.length;
  if (celebrants.length === 0) {
    return result;
  }

  // 4. Retrieve existing SMS messages for this church to prevent duplicates
  const churchSms = db.get('smsMessages').filter(s => s.churchId === church.id);

  // 5. Template resolution
  const configuredTemplate = church.settings?.birthdaySmsTemplate || (church.settings as any)?.birthdayTemplate;
  const template = configuredTemplate && configuredTemplate.trim().length > 0
    ? configuredTemplate.trim()
    : DEFAULT_BIRTHDAY_SMS_TEMPLATE;

  // 6. Process each celebrant
  for (const member of celebrants) {
    // Check valid phone number
    if (!member.phone || member.phone.trim().length < 7) {
      result.skipped++;
      result.details.push({
        memberId: member.id,
        memberName: member.fullName,
        phone: member.phone || '',
        status: 'SKIPPED',
        reason: 'Member does not have a saved phone number.',
      });
      continue;
    }

    const norm = normalizePhoneNumber(member.phone);
    if (!norm.isValid) {
      result.skipped++;
      result.details.push({
        memberId: member.id,
        memberName: member.fullName,
        phone: member.phone,
        status: 'SKIPPED',
        reason: 'Member phone number format is invalid.',
      });
      continue;
    }

    // Check if already successfully sent on this birthday
    const idempotencyKey = `bday_${church.id}_${member.id}_${dateStr}`;
    const alreadySent = churchSms.some(s =>
      s.notificationType === 'BIRTHDAY_GREETING' &&
      (s.memberId === member.id || s.phone === member.phone || s.recipientName === member.fullName) &&
      (s.idempotencyKey === idempotencyKey || (s.sentAt || s.createdAt || '').startsWith(dateStr)) &&
      (s.status === 'Delivered' || s.status === 'Submitted')
    );

    if (alreadySent && !options?.force) {
      result.alreadySent++;
      result.details.push({
        memberId: member.id,
        memberName: member.fullName,
        phone: member.phone,
        status: 'ALREADY_SENT',
        reason: 'Birthday SMS already sent today.',
      });
      continue;
    }

    // Personalize message
    const personalizedMessage = template
      .replace(/\[Member Name\]/gi, member.fullName)
      .replace(/\[Church Name\]/gi, church.name)
      .trim();

    try {
      const sendRes = await SmsService.sendSms({
        churchId: church.id,
        recipientName: member.fullName,
        phone: member.phone,
        message: personalizedMessage,
        notificationType: 'BIRTHDAY_GREETING',
        memberId: member.id,
        idempotencyKey,
      });

      if (sendRes.success) {
        result.sentNow++;
        result.details.push({
          memberId: member.id,
          memberName: member.fullName,
          phone: member.phone,
          status: 'SENT',
        });
      } else {
        result.failed++;
        result.details.push({
          memberId: member.id,
          memberName: member.fullName,
          phone: member.phone,
          status: 'FAILED',
          reason: sendRes.smsMessage?.failureReason || 'SMS gateway could not complete delivery at this time.',
        });
      }
    } catch (err: any) {
      result.failed++;
      result.details.push({
        memberId: member.id,
        memberName: member.fullName,
        phone: member.phone,
        status: 'FAILED',
        reason: err?.message || 'Temporary SMS service interruption. System will retry safely.',
      });
    }
  }

  return result;
}

/**
 * Runs the daily automated birthday process across all registered churches.
 * Autonomous, tenant-isolated, and safe against duplicates.
 */
export async function runDailyBirthdayJob(): Promise<BirthdayProcessResult[]> {
  const churches = db.get('churches');
  const activeChurches = churches.filter(c => c.status === 'ACTIVE' || !c.status);
  const results: BirthdayProcessResult[] = [];

  for (const church of activeChurches) {
    try {
      const res = await processChurchBirthdays(church);
      results.push(res);
      if (res.sentNow > 0) {
        console.log(`[Birthday Cron] Sent ${res.sentNow} birthday SMS for ${church.name} (Local Date: ${res.localDate})`);
      }
    } catch (err) {
      console.error(`[Birthday Cron Error] Church "${church.name}" (${church.id}):`, err);
    }
  }

  return results;
}

let cronInterval: NodeJS.Timeout | null = null;

/**
 * Starts the server-side cron scheduler.
 * Runs periodically (every 15 minutes) to ensure any church transitioning into
 * its local date window receives birthday messages promptly and reliably.
 */
export function startBirthdayCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
  }

  console.log('[Church-OS] Starting automated server-side Birthday SMS cron job...');

  // Run initial pass shortly after boot (5 seconds) once collections are verified
  setTimeout(() => {
    runDailyBirthdayJob().catch(err => {
      console.error('[Birthday Cron Initial Run Error]', err);
    });
  }, 5000);

  // Then check every 15 minutes
  cronInterval = setInterval(() => {
    runDailyBirthdayJob().catch(err => {
      console.error('[Birthday Cron Periodic Run Error]', err);
    });
  }, 15 * 60 * 1000);

  // Unref to avoid blocking clean process shutdown if needed
  if (cronInterval && typeof cronInterval.unref === 'function') {
    cronInterval.unref();
  }
}
