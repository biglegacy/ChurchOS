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

  // If starts with +, inspect digits
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1);
    if (!/^\d+$/.test(digitsOnly)) {
      return { isValid: false, normalized: cleaned, error: 'Contains non-digit characters' };
    }
    // Check if it's +2330... which is a common formatting error
    if (cleaned.startsWith('+2330')) {
      cleaned = '+233' + cleaned.slice(5);
    }
    if (cleaned.length >= 10 && cleaned.length <= 16) {
      return { isValid: true, normalized: cleaned };
    }
    return { isValid: false, normalized: cleaned, error: 'Invalid international length' };
  }

  // If starts with 0 (e.g. 024XXXXXXX or 050XXXXXXX, standard Ghana 10-digit mobile)
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.slice(1);
    if (/^\d{9}$/.test(withoutZero)) {
      return { isValid: true, normalized: `+233${withoutZero}` };
    }
  }

  // If starts with 233
  if (cleaned.startsWith('233')) {
    const afterCode = cleaned.slice(3);
    if (afterCode.startsWith('0')) {
      const proper = afterCode.slice(1);
      if (/^\d{9}$/.test(proper)) {
        return { isValid: true, normalized: `+233${proper}` };
      }
    } else if (/^\d{9}$/.test(afterCode)) {
      return { isValid: true, normalized: `+233${afterCode}` };
    }
  }

  // Generic 9 digits check (without leading 0 -> Ghana standard)
  if (/^\d{9}$/.test(cleaned)) {
    return { isValid: true, normalized: `+233${cleaned}` };
  }

  return { isValid: false, normalized: cleaned, error: 'Invalid phone format' };
}

export interface SendSmsParams {
  churchId: string;
  recipientName: string;
  phone: string;
  message: string;
  notificationType: SmsMessage['notificationType'];
  idempotencyKey?: string;
  customSenderName?: string;
}

export interface SendSmsResult {
  success: boolean;
  smsMessage: SmsMessage;
  alreadySent?: boolean;
}

export class SmsService {
  /**
   * Dispatches an SMS through real Arkesel API gateway with idempotency and accurate tracking.
   */
  public static async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    const { churchId, recipientName, phone, message, notificationType, customSenderName } = params;
    
    // Find church
    const churches = db.get('churches');
    const church = churches.find(c => c.id === churchId);
    const churchName = church ? church.name : 'Church-OS Platform';
    
    // Check if SMS feature enabled for church
    if (church && !church.features.sms) {
      throw new Error(`SMS messaging is currently disabled for your church. Please contact the administrator.`);
    }

    // Determine sender name: church-specific approved name or platform default
    const platformSettings = db.get('platformSettings');
    const senderName = (
      customSenderName ||
      (church && church.settings.senderName ? church.settings.senderName : platformSettings.defaultSenderId || 'CHURCH-OS')
    ).replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || 'CHURCH-OS';

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
        status: 'Unable to Send',
        failureReason: 'Unable to Send — No Valid Phone Number',
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [failedMessage, ...msgs]);
      return { success: false, smsMessage: failedMessage };
    }

    // Check if Arkesel API key is configured
    const apiKey = (platformSettings.apiKey || process.env.ARKESEL_API_KEY || '').trim();
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
        status: 'Failed',
        failureReason: 'SMS Gateway is not configured. Please configure Arkesel API key in Super Admin settings.',
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [failedMessage, ...msgs]);
      return { success: false, smsMessage: failedMessage };
    }

    // Check Central Platform SMS Balance
    if (platformSettings.balanceCredits <= 0) {
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
        status: 'Failed',
        failureReason: 'Central Gateway SMS Credit Balance Exhausted. Please top up in Super Admin.',
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [outOfBalanceMsg, ...msgs]);
      return { success: false, smsMessage: outOfBalanceMsg };
    }

    // Real Arkesel Gateway call
    try {
      const endpoint = platformSettings.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send';
      const cleanPhone = norm.normalized.replace(/^\+/, '');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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

        // Deduct 1 credit from platform settings & update statistics
        db.update('platformSettings', settings => ({
          ...settings,
          balanceCredits: Math.max(0, settings.balanceCredits - 1),
          totalSmsDispatched: (settings.totalSmsDispatched || 0) + 1,
          connectionStatus: 'Connected',
        }));

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
        const failureReason = data?.message || data?.error || `Arkesel Gateway error (HTTP ${response.status})`;

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
      const failureReason = err.name === 'AbortError' ? 'Connection timed out connecting to Arkesel.' : (err.message || 'SMS dispatch failed');

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
   * Real test of Arkesel API connection for Super Admin.
   * Connects to Arkesel, sends a test SMS, and returns true status without fake answers.
   */
  public static async testArkeselConnection(testPhone: string, testMessage?: string): Promise<{ success: boolean; message: string; details?: any }> {
    // 1. Validate phone number
    const norm = normalizePhoneNumber(testPhone);
    if (!norm.isValid) {
      return {
        success: false,
        message: 'SMS test failed. Please check your Arkesel API configuration and try again.',
        details: 'Invalid phone number format. Please provide a valid Ghana phone number (e.g. +233XXXXXXXXX or 024XXXXXXX).',
      };
    }

    // 2. Validate API configuration
    const platformSettings = db.get('platformSettings');
    const apiKey = (platformSettings.apiKey || process.env.ARKESEL_API_KEY || '').trim();
    if (!apiKey) {
      return {
        success: false,
        message: 'SMS test failed. Please check your Arkesel API configuration and try again.',
        details: 'Arkesel API key is not configured. Please enter and save your Arkesel API key in settings.',
      };
    }

    // 3. Connect to Arkesel
    try {
      const endpoint = platformSettings.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send';
      const cleanPhone = norm.normalized.replace(/^\+/, '');
      const sender = (platformSettings.defaultSenderId || 'CHURCH-OS').replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || 'CHURCH-OS';
      const msg = testMessage || 'This is a test message from the church management system.';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        db.update('platformSettings', settings => ({
          ...settings,
          balanceCredits: Math.max(0, settings.balanceCredits - 1),
          totalSmsDispatched: (settings.totalSmsDispatched || 0) + 1,
          connectionStatus: 'Connected',
        }));

        return {
          success: true,
          message: 'SMS test sent successfully.',
          details: {
            recipient: norm.normalized,
            providerResponse: data?.message || 'Delivered',
          },
        };
      } else {
        const failureReason = data?.message || data?.error || `Arkesel Gateway returned status ${response.status}`;
        db.update('platformSettings', settings => ({
          ...settings,
          connectionStatus: 'Disconnected',
        }));

        return {
          success: false,
          message: 'SMS test failed. Please check your Arkesel API configuration and try again.',
          details: failureReason,
        };
      }
    } catch (err: any) {
      db.update('platformSettings', settings => ({
        ...settings,
        connectionStatus: 'Disconnected',
      }));

      const errorMsg = err.name === 'AbortError' ? 'Connection timed out connecting to Arkesel.' : err.message;
      return {
        success: false,
        message: 'SMS test failed. Please check your Arkesel API configuration and try again.',
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
   * Automated Tithe Confirmation SMS
   */
  public static async sendTitheConfirmation(churchId: string, givingId: string): Promise<SendSmsResult | null> {
    const churches = db.get('churches');
    const church = churches.find(c => c.id === churchId);
    if (!church || !church.features.sms || !church.settings.titheConfirmationSmsEnabled) {
      return null;
    }

    const givingRecords = db.get('giving');
    const record = givingRecords.find(g => g.id === givingId && g.churchId === churchId);
    if (!record || record.givingType !== 'Tithe' || !record.phone) {
      return null;
    }

    const template = church.settings.titheConfirmationTemplate ||
      "Dear [Member Name], your tithe of GH₵[Amount] has been recorded successfully. Thank you for your faithful giving. — [Church Name]";

    const message = template
      .replace(/\[Member Name\]/g, record.memberName)
      .replace(/\[Amount\]/g, record.amount.toLocaleString())
      .replace(/\[Church Name\]/g, church.name);

    const idempotencyKey = `tithe_${churchId}_${givingId}`;

    const result = await this.sendSms({
      churchId,
      recipientName: record.memberName,
      phone: record.phone,
      message,
      notificationType: 'TITHE_CONFIRMATION',
      idempotencyKey,
    });

    if (result.success) {
      db.update('giving', list =>
        list.map(g => (g.id === givingId ? { ...g, smsSent: true, smsMessageId: result.smsMessage.id } : g))
      );
    }

    return result;
  }
}
