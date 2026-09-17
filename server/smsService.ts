import { db, SmsMessage } from './db';
import crypto from 'crypto';

/**
 * Normalizes phone numbers specifically for Ghana (+233) while supporting international numbers.
 * Examples:
 * "0241234567" -> "+233241234567"
 * "0541234567" -> "+233541234567"
 * "233241234567" -> "+233241234567"
 * "+233241234567" -> "+233241234567"
 * Avoids errors like "+2330241234567"
 */
export function normalizePhoneNumber(input: string | undefined | null): { isValid: boolean; normalized: string; error?: string } {
  if (!input) {
    return { isValid: false, normalized: '', error: 'No phone number provided' };
  }

  // Remove spaces, hyphens, brackets, dots
  let cleaned = input.replace(/[\s\-\(\)\.]/g, '').trim();

  // Convert international prefix 00 to +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // If starts with +, inspect digits
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1);
    if (!/^\d+$/.test(digitsOnly)) {
      return { isValid: false, normalized: cleaned, error: 'Phone number contains non-digit characters' };
    }
    // Check if it's +2330... which is a common formatting error for Ghana
    if (cleaned.startsWith('+2330')) {
      cleaned = '+233' + cleaned.slice(5);
    }
    if (cleaned.length >= 9 && cleaned.length <= 16) {
      return { isValid: true, normalized: cleaned };
    }
    return { isValid: false, normalized: cleaned, error: 'Phone number must be between 8 and 15 digits' };
  }

  // If starts with 0 (e.g. 024XXXXXXX or 050XXXXXXX, standard Ghana 10-digit mobile)
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.slice(1);
    if (/^\d{9}$/.test(withoutZero)) {
      return { isValid: true, normalized: `+233${withoutZero}` };
    }
    if (/^\d{8,14}$/.test(withoutZero)) {
      return { isValid: true, normalized: `+233${withoutZero}` };
    }
  }

  // If starts with 233
  if (cleaned.startsWith('233')) {
    const afterCode = cleaned.slice(3);
    if (afterCode.startsWith('0')) {
      const proper = afterCode.slice(1);
      if (/^\d{8,10}$/.test(proper)) {
        return { isValid: true, normalized: `+233${proper}` };
      }
    } else if (/^\d{8,10}$/.test(afterCode)) {
      return { isValid: true, normalized: `+233${afterCode}` };
    }
  }

  // Generic 9 digits check (without leading 0 -> Ghana standard)
  if (/^\d{9}$/.test(cleaned)) {
    return { isValid: true, normalized: `+233${cleaned}` };
  }

  // Generic 10-15 digits without plus -> treat as international standard
  if (/^\d{10,15}$/.test(cleaned)) {
    return { isValid: true, normalized: `+${cleaned}` };
  }

  return { isValid: false, normalized: cleaned, error: 'Please enter a valid phone number (e.g. 0241234567 or +233241234567)' };
}

export interface SendSmsParams {
  churchId: string;
  recipientName: string;
  phone: string;
  message: string;
  notificationType: SmsMessage['notificationType'];
  idempotencyKey?: string;
  customSenderName?: string;
  relatedContributionId?: string;
  relatedReceiptNumber?: string;
}

export interface SendSmsResult {
  success: boolean;
  smsMessage: SmsMessage;
  alreadySent?: boolean;
}

/**
 * Derives a compliant GSM alphanumeric sender ID (max 11 chars) from registered church name.
 * Each church automatically uses its own registered church name from Firebase.
 */
export function deriveSenderIdFromChurchName(churchName: string, configuredSender?: string): string {
  // If church has a custom approved sender name in its settings, respect it
  if (configuredSender && configuredSender.trim().length >= 3) {
    const cleaned = configuredSender.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11);
    if (cleaned.length >= 3) return cleaned;
  }

  // Derive directly from the official registered church name in Firebase
  const alphanumeric = churchName.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumeric.length >= 3) {
    return alphanumeric.slice(0, 11);
  }

  // Fallback if needed
  return (churchName.replace(/[^a-zA-Z0-9]/g, '') || 'CHURCH').padEnd(3, '1').slice(0, 11);
}

export class SmsService {
  /**
   * Dispatches an SMS through real Arkesel API gateway with idempotency and accurate tracking.
   * Follows the workflow:
   * Logged-in Church -> Authenticated Church ID -> Firebase Church Record -> Registered Church Name -> SMS Sender Name -> SMS Provider
   */
  public static async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    const { churchId, recipientName, phone, message, notificationType, customSenderName, relatedContributionId, relatedReceiptNumber } = params;
    
    // Find church from Firebase
    const churches = db.get('churches');
    const church = churches.find(c => c.id === churchId);
    
    if (churchId && churchId !== 'PLATFORM' && !church) {
      throw new Error(`Church record not found in Firebase for ID "${churchId}".`);
    }

    const churchName = church ? church.name : 'Central Platform';
    
    // Check if SMS feature enabled for church
    if (church && church.features && church.features.sms === false) {
      throw new Error(`SMS messaging is currently disabled for ${churchName}. Please contact the administrator.`);
    }

    // Check if SMS is disabled in church settings
    if (church && church.settings && church.settings.smsEnabled === false) {
      const now = new Date().toISOString();
      const smsId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const disabledMsg: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        recipientName,
        phone,
        normalizedPhone: phone,
        senderName: church.settings.senderName || 'CHURCH',
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Failed',
        failureReason: 'SMS is disabled for this church in SMS Settings.',
        sentAt: now,
        createdAt: now,
      };
      db.update('smsMessages', msgs => [disabledMsg, ...msgs]);
      return { success: false, smsMessage: disabledMsg };
    }

    // Determine sender name:
    const platformSettings = db.get('platformSettings');
    let senderName: string;
    if (church) {
      senderName = deriveSenderIdFromChurchName(church.name, church.settings?.senderName || church.settings?.smsSenderId);
    } else {
      senderName = (customSenderName || platformSettings.defaultSenderId || 'CHURCH-OS')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 11) || 'CHURCH-OS';
    }

    // Create unique idempotency key if not supplied
    const key = params.idempotencyKey || `sms_${churchId}_${crypto.createHash('md5').update(`${recipientName}_${phone}_${message}_${notificationType}`).digest('hex')}`;

    // Check existing messages for duplicate prevention
    const existingMessages = db.get('smsMessages');
    const duplicate = existingMessages.find(m => m.idempotencyKey === key && m.churchId === churchId);
    if (duplicate) {
      console.log(`[SMS-Service] Idempotency match: Duplicate prevented for key "${key}"`);
      return {
        success: duplicate.status === 'Delivered' || duplicate.status === 'Submitted',
        smsMessage: duplicate,
        alreadySent: true,
      };
    }

    // Normalize phone number
    const norm = normalizePhoneNumber(phone);
    const now = new Date().toISOString();
    const smsId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!norm.isValid) {
      const failedMessage: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        recipientName,
        phone,
        normalizedPhone: norm.normalized || phone,
        senderName,
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Unable to Send',
        failureReason: 'Unable to Send — No Valid Phone Number',
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [failedMessage, ...msgs]);
      return { success: false, smsMessage: failedMessage };
    }

    // Resolve API key: Church-specific API key first, then platform fallback
    const churchApiKey = (church?.settings?.smsApiKey || '').trim();
    const apiKey = churchApiKey || (platformSettings.apiKey || process.env.ARKESEL_API_KEY || '').trim();
    const gateway = church?.settings?.smsGateway || 'Arkesel';

    if (!apiKey) {
      const failedMessage: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        recipientName,
        phone,
        normalizedPhone: norm.normalized,
        senderName,
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Failed',
        failureReason: 'SMS Gateway is not configured. Please enter your API key in Church SMS Settings.',
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [failedMessage, ...msgs]);
      return { success: false, smsMessage: failedMessage };
    }

    // Check central credit balance only if church is NOT using their own API key
    if (!churchApiKey && platformSettings.balanceCredits <= 0) {
      const outOfBalanceMsg: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        recipientName,
        phone,
        normalizedPhone: norm.normalized,
        senderName,
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Failed',
        failureReason: 'Central Gateway SMS Credit Balance Exhausted. Please top up or configure your own Gateway API key in SMS Settings.',
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [outOfBalanceMsg, ...msgs]);
      return { success: false, smsMessage: outOfBalanceMsg };
    }

    // Real Gateway call
    try {
      const endpoint = gateway === 'Arkesel' ? 'https://sms.arkesel.com/api/v2/sms/send' : (platformSettings.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send');
      const cleanPhone = norm.normalized.replace(/^\+/, '');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: senderName,
          message,
          recipients: [cleanPhone],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: any = await response.json().catch(() => null);

      if (response.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000')) {
        const providerMessageId = data?.data?.[0]?.id || `ARK-${Date.now()}`;
        const remainingSms = typeof data?.sms_balance === 'number' ? data.sms_balance : undefined;

        // Deduct platform credit only if not using own direct API key
        if (!churchApiKey) {
          db.update('platformSettings', settings => ({
            ...settings,
            balanceCredits: remainingSms !== undefined ? remainingSms : Math.max(0, settings.balanceCredits - 1),
            totalSmsDispatched: (settings.totalSmsDispatched || 0) + 1,
            connectionStatus: 'Connected',
          }));
        }

        const successfulMessage: SmsMessage = {
          id: smsId,
          churchId,
          churchName,
          recipientName,
          phone,
          normalizedPhone: norm.normalized,
          senderName,
          message,
          notificationType,
          relatedContributionId,
          relatedReceiptNumber,
          status: 'Delivered',
          providerResponse: 'DELIVERED_SUCCESSFULLY',
          providerMessageId,
          idempotencyKey: key,
          sentAt: now,
          createdAt: now,
        };

        db.update('smsMessages', msgs => [successfulMessage, ...msgs]);

        // Record audit log
        db.update('auditLogs', logs => [
          {
            id: `aud_${Date.now()}`,
            churchId,
            userId: 'system',
            userName: 'Church-OS SMS Dispatcher',
            action: 'SMS_SENT',
            details: `Dispatched ${notificationType} to ${recipientName} (${norm.normalized}). Provider Ref: ${providerMessageId}`,
            timestamp: now,
          },
          ...logs.slice(0, 499),
        ]);

        return { success: true, smsMessage: successfulMessage };
      } else {
        const failureReason = data?.message || data?.error || `SMS Gateway returned HTTP ${response.status}`;

        const failedMessage: SmsMessage = {
          id: smsId,
          churchId,
          churchName,
          recipientName,
          phone,
          normalizedPhone: norm.normalized,
          senderName,
          message,
          notificationType,
          relatedContributionId,
          relatedReceiptNumber,
          status: 'Failed',
          failureReason,
          idempotencyKey: key,
          sentAt: now,
          createdAt: now,
        };

        db.update('smsMessages', msgs => [failedMessage, ...msgs]);
        return { success: false, smsMessage: failedMessage };
      }
    } catch (err: any) {
      const failureReason = err.name === 'AbortError' ? 'Connection timed out connecting to SMS gateway.' : (err.message || 'SMS dispatch failed');

      const failedMessage: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        recipientName,
        phone,
        normalizedPhone: norm.normalized,
        senderName,
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Failed',
        failureReason,
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [failedMessage, ...msgs]);
      return { success: false, smsMessage: failedMessage };
    }
  }

  /**
   * Verify Arkesel Gateway API credentials & check live carrier balance.
   * Connects to https://sms.arkesel.com/api/v2/clients/balance-details without sending an SMS.
   */
  public static async checkGatewayBalance(): Promise<{ success: boolean; balanceCredits?: number; mainBalance?: string; message: string; details?: any }> {
    const platformSettings = db.get('platformSettings');
    const apiKey = (platformSettings.apiKey || process.env.ARKESEL_API_KEY || '').trim();

    if (!apiKey) {
      return {
        success: false,
        message: 'Arkesel API key is not configured. Please enter your API key in Arkesel configuration.',
        details: 'Missing Arkesel API key.',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://sms.arkesel.com/api/v2/clients/balance-details', {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: any = await response.json().catch(() => null);

      if (response.ok && data?.status === 'success') {
        const smsBal = typeof data.data?.sms_balance === 'number' ? data.data.sms_balance : platformSettings.balanceCredits;
        const mainBal = data.data?.main_balance || 'GHS 0.00';

        db.update('platformSettings', settings => ({
          ...settings,
          connectionStatus: 'Connected',
          balanceCredits: smsBal,
          hasApiKey: true,
        }));

        return {
          success: true,
          balanceCredits: smsBal,
          mainBalance: mainBal,
          message: `Arkesel Gateway connected. Live SMS Balance: ${smsBal.toLocaleString()} units (${mainBal}).`,
          details: data.data,
        };
      } else {
        const errMsg = data?.message || data?.error || `Arkesel returned HTTP ${response.status}`;
        db.update('platformSettings', settings => ({
          ...settings,
          connectionStatus: 'Disconnected',
        }));
        return {
          success: false,
          message: `Arkesel verification failed: ${errMsg}`,
          details: errMsg,
        };
      }
    } catch (err: any) {
      const errMsg = err.name === 'AbortError' ? 'Connection timed out reaching Arkesel Gateway.' : (err.message || 'Verification request failed');
      db.update('platformSettings', settings => ({
        ...settings,
        connectionStatus: 'Disconnected',
      }));
      return {
        success: false,
        message: `Arkesel verification error: ${errMsg}`,
        details: errMsg,
      };
    }
  }

  /**
   * Real test of Arkesel API connection for Super Admin.
   * Connects to Arkesel, sends a test SMS, and returns accurate status and details.
   */
  public static async testArkeselConnection(testPhone: string, testMessage?: string): Promise<{ success: boolean; message: string; details?: any }> {
    // 1. Validate API configuration first
    const platformSettings = db.get('platformSettings');
    const apiKey = (platformSettings.apiKey || process.env.ARKESEL_API_KEY || '').trim();
    if (!apiKey) {
      return {
        success: false,
        message: 'Arkesel API key is not configured. Please enter and save your Arkesel API key in settings.',
        details: 'Missing Arkesel API key. Please configure your API key in Arkesel SMS Gateway Configuration.',
      };
    }

    // 2. Validate phone number
    const norm = normalizePhoneNumber(testPhone);
    if (!norm.isValid) {
      return {
        success: false,
        message: `Invalid recipient phone number "${testPhone}". Please provide a valid Ghana or international phone number.`,
        details: norm.error || 'Invalid phone number format. Examples: 0241234567, +233241234567, or international with country code.',
      };
    }

    // 3. Connect to Arkesel with 25s timeout
    try {
      const endpoint = platformSettings.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send';
      const cleanPhone = norm.normalized.replace(/^\+/, '');
      const sender = (platformSettings.defaultSenderId || 'CHURCH-OS').replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || 'CHURCH-OS';
      const msg = testMessage || 'This is a test message from the church management system.';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender,
          message: msg,
          recipients: [cleanPhone],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: any = await response.json().catch(() => null);

      if (response.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000')) {
        const remainingSms = typeof data?.sms_balance === 'number' ? data.sms_balance : undefined;

        db.update('platformSettings', settings => ({
          ...settings,
          balanceCredits: remainingSms !== undefined ? remainingSms : Math.max(0, settings.balanceCredits - 1),
          totalSmsDispatched: (settings.totalSmsDispatched || 0) + 1,
          connectionStatus: 'Connected',
          hasApiKey: true,
        }));

        return {
          success: true,
          message: 'SMS test sent successfully.',
          details: {
            recipient: norm.normalized,
            providerResponse: data?.message || 'Delivered',
            smsBalance: data?.sms_balance,
          },
        };
      } else {
        const failureReason = data?.message || data?.error || (data?.errors ? JSON.stringify(data.errors) : `Arkesel Gateway returned status ${response.status}`);
        db.update('platformSettings', settings => ({
          ...settings,
          connectionStatus: 'Disconnected',
        }));

        return {
          success: false,
          message: `Arkesel Gateway Error: ${failureReason}`,
          details: failureReason,
        };
      }
    } catch (err: any) {
      db.update('platformSettings', settings => ({
        ...settings,
        connectionStatus: 'Disconnected',
      }));

      const errorMsg = err.name === 'AbortError' ? 'Connection timed out connecting to Arkesel SMS gateway after 25s.' : (err.message || 'SMS test request failed');
      return {
        success: false,
        message: `Arkesel connection error: ${errorMsg}`,
        details: errorMsg,
      };
    }
  }

  /**
   * Process automated absence follow-up when church attendance is finalized.
   */
  public static async processAttendanceAbsenceSms(churchId: string, serviceId: string, finalizedBy: string): Promise<{ totalAbsent: number; sent: number; skipped: number }> {
    const churches = db.get('churches');
    const church = churches.find(c => c.id === churchId);
    if (!church) throw new Error('Church not found');

    if (!church.features.sms || !church.settings.absenceSmsEnabled) {
      return { totalAbsent: 0, sent: 0, skipped: 0 };
    }

    const services = db.get('services');
    const service = services.find(s => s.id === serviceId && s.churchId === churchId);
    if (!service) throw new Error('Service not found');

    // Get attendance records for this service
    const attendanceRecords = db.get('attendance').filter(a => a.serviceId === serviceId && a.churchId === churchId);
    const absentRecords = attendanceRecords.filter(a => a.status === 'Absent');

    let sent = 0;
    let skipped = 0;

    const template = church.settings.absenceSmsTemplate ||
      "Dear [Member Name], we missed you at [Church Name] today. We hope you are well. We look forward to worshipping with you again. — [Church Name]";

    for (const record of absentRecords) {
      const members = db.get('members');
      const member = members.find(m => m.id === record.memberId && m.churchId === churchId);
      const memberName = member ? member.fullName : record.memberName;
      const memberPhone = member ? member.phone : record.memberPhone;

      if (!memberPhone) {
        skipped++;
        continue;
      }

      const customizedMessage = template
        .replace(/\[Member Name\]/g, memberName)
        .replace(/\[Church Name\]/g, church.name)
        .replace(/\[Service Name\]/g, service.serviceName);

      const idempotencyKey = `absence_${churchId}_${serviceId}_${record.memberId}_${service.date}`;

      try {
        const result = await this.sendSms({
          churchId,
          recipientName: memberName,
          phone: memberPhone,
          message: customizedMessage,
          notificationType: 'ABSENCE_FOLLOWUP',
          idempotencyKey,
        });

        if (result.success && !result.alreadySent) {
          sent++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Failed to send absence SMS to ${memberName}:`, err);
        skipped++;
      }
    }

    // Update service record with finalized status & count
    db.update('services', srvs =>
      srvs.map(s => {
        if (s.id === serviceId) {
          return {
            ...s,
            attendanceFinalized: true,
            attendanceFinalizedAt: new Date().toISOString(),
            attendanceFinalizedBy: finalizedBy,
            absenceSmsSentCount: (s.absenceSmsSentCount || 0) + sent,
          };
        }
        return s;
      })
    );

    return { totalAbsent: absentRecords.length, sent, skipped };
  }

  /**
   * Automated Contribution Confirmation SMS (Requirements 2, 3, 10)
   * When an enabled contribution is recorded:
   * 1. Check whether church SMS is enabled.
   * 2. Check whether that contribution type is configured for automatic SMS.
   * 3. Check whether the member has a valid phone number.
   * 4. Generate a professional receipt SMS (Church, Member, Type, Amount, Date, Receipt Ref, Appreciation).
   * 5. Send SMS through the configured gateway.
   * 6. Record attempt in SMS History without reversing the contribution if SMS gateway temporarily fails.
   */
  public static async sendContributionConfirmation(churchId: string, givingId: string): Promise<SendSmsResult | null> {
    const churches = db.get('churches');
    const church = churches.find(c => c.id === churchId);
    if (!church) return null;

    // Check master SMS switch
    if (church.features && church.features.sms === false) {
      return null;
    }
    if (church.settings && church.settings.smsEnabled === false) {
      return null;
    }
    if (church.settings && church.settings.autoContributionSmsEnabled === false) {
      return null;
    }

    const givingRecords = db.get('giving');
    const record = givingRecords.find(g => g.id === givingId && g.churchId === churchId);
    if (!record) return null;

    // Check configured automatic contribution SMS types (Requirement 2)
    const configuredTypes = (church.settings?.autoContributionSmsTypes && church.settings.autoContributionSmsTypes.length > 0)
      ? church.settings.autoContributionSmsTypes.map(t => t.toLowerCase().trim())
      : ['tithe', 'offering', 'thanksgiving', 'donation', 'welfare', 'building fund', 'missions', 'special contributions', 'special offering', 'first fruit'];

    const currentType = (record.givingType || '').toLowerCase().trim();
    if (!configuredTypes.includes(currentType)) {
      console.log(`[SMS-Service] Skipping auto SMS: Type "${record.givingType}" is not configured for automatic SMS.`);
      return null;
    }

    // Determine recipient phone and name
    let recipientPhone = record.phone;
    let recipientName = record.memberName || 'Beloved';

    // If linked to a member, fetch member details if phone missing
    if ((!recipientPhone || !recipientPhone.trim()) && record.memberId) {
      const member = db.get('members').find(m => m.id === record.memberId && m.churchId === churchId);
      if (member) {
        recipientPhone = member.phone;
        recipientName = member.fullName || recipientName;
      }
    }

    const receiptRef = record.receiptNumber || record.referenceNumber || `RCP-${record.id.slice(-6)}`;
    const currencyStr = record.currency || church.settings?.currency || 'GH₵';
    const amountNum = typeof record.amount === 'number' ? record.amount : parseFloat(record.amount) || 0;
    const amountStr = amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Format date e.g. "17 Sep 2026"
    let dateStr = record.date;
    try {
      const d = new Date(record.date || record.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {}

    // Check phone validity (Requirement 5 & 10)
    const norm = normalizePhoneNumber(recipientPhone);
    const now = new Date().toISOString();
    const smsId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `auto_giving_${churchId}_${givingId}`;

    if (!norm.isValid) {
      const unableMsg: SmsMessage = {
        id: smsId,
        churchId,
        churchName: church.name,
        recipientName,
        phone: recipientPhone || '',
        normalizedPhone: norm.normalized || recipientPhone || '',
        senderName: deriveSenderIdFromChurchName(church.name, church.settings?.senderName || church.settings?.smsSenderId),
        message: `Contribution receipt for ${record.givingType} (${currencyStr} ${amountStr})`,
        notificationType: 'CONTRIBUTION_CONFIRMATION',
        relatedContributionId: givingId,
        relatedReceiptNumber: receiptRef,
        status: 'Unable to Send',
        failureReason: 'Unable to Send — No Valid Phone Number',
        idempotencyKey,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [unableMsg, ...msgs]);
      db.update('giving', list =>
        list.map(g => (g.id === givingId ? { ...g, smsSent: false, smsMessageId: unableMsg.id } : g))
      );
      return { success: false, smsMessage: unableMsg };
    }

    // Professional contribution SMS content (Requirement 3)
    const customTemplate = church.settings?.contributionSmsTemplate;
    let messageBody = '';
    if (customTemplate && customTemplate.trim().length > 0) {
      messageBody = customTemplate
        .replace(/\[Member Name\]/g, recipientName)
        .replace(/\[Church Name\]/g, church.name)
        .replace(/\[Contribution Type\]/g, record.givingType)
        .replace(/\[Amount\]/g, amountStr)
        .replace(/\[Currency\]/g, currencyStr)
        .replace(/\[Date\]/g, dateStr)
        .replace(/\[Receipt Number\]/g, receiptRef)
        .replace(/\[Reference\]/g, receiptRef);
    } else {
      // Standard concise receipt (Requirement 3 example)
      messageBody = `Dear ${recipientName}, your ${record.givingType} of ${currencyStr} ${amountStr} has been successfully recorded by ${church.name} on ${dateStr}. Ref: ${receiptRef}. Thank you and God bless you.`;
    }

    const result = await this.sendSms({
      churchId,
      recipientName,
      phone: recipientPhone,
      message: messageBody,
      notificationType: 'CONTRIBUTION_CONFIRMATION',
      idempotencyKey,
      relatedContributionId: givingId,
      relatedReceiptNumber: receiptRef,
    });

    // Update giving record status
    if (result.success) {
      db.update('giving', list =>
        list.map(g => (g.id === givingId ? { ...g, smsSent: true, smsMessageId: result.smsMessage.id } : g))
      );
    } else {
      db.update('giving', list =>
        list.map(g => (g.id === givingId ? { ...g, smsSent: false, smsMessageId: result.smsMessage?.id } : g))
      );
    }

    return result;
  }

  /**
   * Automated Tithe Confirmation SMS (Legacy alias)
   */
  public static async sendTitheConfirmation(churchId: string, givingId: string): Promise<SendSmsResult | null> {
    return this.sendContributionConfirmation(churchId, givingId);
  }

  /**
   * Test SMS Gateway connection for church settings (Requirement 4 & 12)
   * Sends an actual live SMS to the administrator's test phone number using their API key and sender ID.
   * No simulation or fake responses.
   */
  public static async testChurchGatewayConnection(params: {
    churchId: string;
    gateway?: string;
    apiKey: string;
    senderId?: string;
    testPhone: string;
  }): Promise<{ success: boolean; message: string; details?: any }> {
    const { churchId, apiKey, senderId, testPhone } = params;
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return {
        success: false,
        message: 'SMS Gateway API key is required. Please enter an API key to test.',
      };
    }

    const norm = normalizePhoneNumber(testPhone);
    if (!norm.isValid) {
      return {
        success: false,
        message: norm.error || 'Please enter a valid phone number (e.g. 024XXXXXXX) to receive the test SMS.',
      };
    }

    const churches = db.get('churches');
    const church = churches.find(c => c.id === churchId);
    const churchName = church?.name || 'Church-OS';
    const effectiveSender = (senderId || deriveSenderIdFromChurchName(churchName)).slice(0, 11);
    const cleanPhone = norm.normalized.replace(/^\+/, '');
    const testMsg = `[${churchName}] SMS gateway test successful. Your SMS configuration is active and working.`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers: {
          'api-key': cleanKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: effectiveSender,
          message: testMsg,
          recipients: [cleanPhone],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: any = await response.json().catch(() => null);

      if (response.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000')) {
        return {
          success: true,
          message: `Gateway connection verified! Test SMS successfully sent to ${norm.normalized} with Sender ID "${effectiveSender}".`,
          details: data,
        };
      } else {
        const errMsg = data?.message || data?.error || `Gateway returned HTTP ${response.status}`;
        return {
          success: false,
          message: `SMS Gateway rejected test: ${errMsg}`,
          details: data,
        };
      }
    } catch (err: any) {
      const errMsg = err.name === 'AbortError' ? 'Connection timed out connecting to SMS gateway after 20s.' : (err.message || 'Connection test failed');
      return {
        success: false,
        message: `Network error connecting to SMS Gateway: ${errMsg}`,
        details: errMsg,
      };
    }
  }
}
