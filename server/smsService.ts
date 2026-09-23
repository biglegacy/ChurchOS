import { db, SmsMessage, SmsDeliveryStatus, SmsStatus } from './db';
import crypto from 'crypto';

/**
 * Maps Arkesel delivery status string to our internal SmsDeliveryStatus.
 * Handles SUBMITTED, QUEUED, PENDING, DELIVERED, NOT_DELIVERED, FAILED, EXPIRED, PROHIBITED, etc.
 */
export function mapArkeselDeliveryStatus(rawStatus: string | undefined | null): {
  status: SmsDeliveryStatus;
  isDelivered: boolean;
  isFailed: boolean;
  isPending: boolean;
} {
  if (!rawStatus) {
    return { status: 'Pending', isDelivered: false, isFailed: false, isPending: true };
  }
  const upper = rawStatus.toString().trim().toUpperCase().replace(/[\s\-]/g, '_');

  switch (upper) {
    // Only actual carrier delivery acknowledgment transitions status to Delivered
    case 'DELIVERED':
    case 'DELIVRD':
      return { status: 'Delivered', isDelivered: true, isFailed: false, isPending: false };

    // API submission or operator transmission is IN TRANSIT / SUBMITTED, NOT delivered
    case 'SUBMITTED':
    case 'SENT':
    case 'IN_TRANSIT':
    case 'PROCESSING':
      return { status: 'Submitted', isDelivered: false, isFailed: false, isPending: true };

    case 'QUEUED':
      return { status: 'Queued', isDelivered: false, isFailed: false, isPending: true };

    case 'PENDING':
    case 'PENDING_DELIVERY':
    case 'SENDING':
      return { status: 'Pending', isDelivered: false, isFailed: false, isPending: true };

    case 'ACCEPTED':
    case 'SUCCESS':
      return { status: 'Accepted', isDelivered: false, isFailed: false, isPending: true };

    case 'NOT_DELIVERED':
    case 'UNDELIVERED':
      return { status: 'Not Delivered', isDelivered: false, isFailed: true, isPending: false };

    case 'FAILED':
    case 'FAIL':
    case 'ERROR':
      return { status: 'Failed', isDelivered: false, isFailed: true, isPending: false };

    case 'EXPIRED':
      return { status: 'Expired', isDelivered: false, isFailed: true, isPending: false };

    case 'PROHIBITED':
    case 'BLOCKED':
    case 'BLACKLISTED':
      return { status: 'Prohibited', isDelivered: false, isFailed: true, isPending: false };

    case 'REJECTED':
      return { status: 'Rejected', isDelivered: false, isFailed: true, isPending: false };

    default:
      if (upper === 'DELIVERED' || upper === 'DELIVRD') {
        return { status: 'Delivered', isDelivered: true, isFailed: false, isPending: false };
      }
      if (upper.includes('FAIL') || upper.includes('REJECT') || upper.includes('ERROR')) {
        return { status: 'Failed', isDelivered: false, isFailed: true, isPending: false };
      }
      return { status: 'Pending', isDelivered: false, isFailed: false, isPending: true };
  }
}

/**
 * Standard GSM 03.38 vs Unicode SMS Unit / Segment Calculation.
 * GSM 7-bit standard: 1 segment <= 160 characters; Multi-part: 153 characters per segment.
 * Unicode (UCS-2): 1 segment <= 70 characters; Multi-part: 67 characters per segment.
 */
export function calculateSmsUnits(message: string): number {
  if (!message || message.length === 0) return 1;
  // Check if message contains non-GSM 03.38 characters (Unicode)
  const isUnicode = /[^\u0020-\u007E\r\n\u00A3\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\u00D8\u00F8\u00C5\u00E5\u0394\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\u00C6\u00E6\u00DF\u00C9\u00A4\u00A1\u00BF]/.test(message);
  
  const length = message.length;
  if (!isUnicode) {
    if (length <= 160) return 1;
    return Math.ceil(length / 153);
  } else {
    if (length <= 70) return 1;
    return Math.ceil(length / 67);
  }
}

/**
 * Detects Ghanaian mobile network operator from normalized or raw phone number.
 * Supports all Ghanaian networks:
 * - MTN (024, 025, 053, 054, 055, 059)
 * - Telecel (020, 050)
 * - AT / AirtelTigo (026, 027, 056, 057)
 * - Glo / Other (023, 028)
 */
export function getGhanaianNetwork(phone: string): { network: 'MTN' | 'Telecel' | 'AT' | 'Ghana Mobile' | 'International / Other'; isValid: boolean } {
  const norm = normalizePhoneNumber(phone);
  if (!norm.isValid) return { network: 'International / Other', isValid: false };
  const num = norm.normalized;
  if (num.startsWith('+233')) {
    const prefix = num.slice(4, 6);
    if (['24', '25', '53', '54', '55', '59'].includes(prefix)) {
      return { network: 'MTN', isValid: true };
    }
    if (['20', '50'].includes(prefix)) {
      return { network: 'Telecel', isValid: true };
    }
    if (['26', '27', '56', '57'].includes(prefix)) {
      return { network: 'AT', isValid: true };
    }
    return { network: 'Ghana Mobile', isValid: true };
  }
  return { network: 'International / Other', isValid: true };
}

/**
 * Normalizes phone numbers specifically for Ghana (+233) while supporting international numbers.
 * Supports all Ghanaian mobile networks without restriction (Telecel, MTN, AT, etc.).
 * Accepts:
 * "0XXXXXXXXX" -> "+233XXXXXXXXX"
 * "+233XXXXXXXXX" -> "+233XXXXXXXXX"
 * "233XXXXXXXXX" -> "+233XXXXXXXXX"
 * "+2330XXXXXXXXX" -> "+233XXXXXXXXX"
 * "XXXXXXXXX" -> "+233XXXXXXXXX"
 */
export function normalizePhoneNumber(input: string | undefined | null): { isValid: boolean; normalized: string; error?: string } {
  if (!input || !input.trim()) {
    return { isValid: false, normalized: '', error: 'No phone number provided' };
  }

  // Remove spaces, hyphens, brackets, dots, commas, slashes, and harmless formatting characters
  let cleaned = input.replace(/[\s\u00a0\-\(\)\.\/\,\_\#\:\;]/g, '').trim();

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

  // If starts with 0 (e.g. 020, 050, 024, 054, 055, 059, 026, 027, 056, 057, 025, 053, standard Ghana 10-digit mobile)
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.slice(1);
    if (/^\d{9}$/.test(withoutZero)) {
      return { isValid: true, normalized: `+233${withoutZero}` };
    }
    if (/^\d{8,14}$/.test(withoutZero)) {
      return { isValid: true, normalized: `+233${withoutZero}` };
    }
  }

  // If starts with 233 (e.g. 233201234567, 233241234567, 233261234567)
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

  return { isValid: false, normalized: cleaned, error: 'Please enter a valid phone number (e.g. 0241234567, 0201234567, or +233241234567)' };
}

export interface SendSmsParams {
  churchId: string;
  memberId?: string;
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

/**
 * Extracts comprehensive, per-recipient and gateway-level error messages
 * from Arkesel SMS API responses (including validation errors, unapproved sender IDs,
 * network restrictions, insufficient balance, invalid destinations, etc.).
 */
export function extractDetailedArkeselError(data: any, httpStatus: number): string {
  if (!data) {
    return `SMS Gateway returned HTTP ${httpStatus} (empty response)`;
  }

  const parts: string[] = [];

  // 1. Arkesel gateway error codes (e.g. 1001, 1002, 1003 [Sender ID unapproved/blocked], 1004, 1005 [Invalid recipient])
  if (data.code && data.code !== 1000 && data.code !== '1000') {
    parts.push(`[Gateway Code ${data.code}]`);
  }

  // 2. High-level human readable error or message (skip generic Laravel message if specific errors exist)
  if (data.message && typeof data.message === 'string' && data.message !== 'The given data was invalid.') {
    parts.push(data.message);
  } else if (data.error && typeof data.error === 'string') {
    parts.push(data.error);
  }

  // 3. Validation errors map (Laravel/Arkesel format e.g. { errors: { sender: [...], recipients: [...] } })
  if (data.errors && typeof data.errors === 'object') {
    for (const [field, fieldErrors] of Object.entries(data.errors)) {
      if (Array.isArray(fieldErrors)) {
        parts.push(`${field}: ${fieldErrors.join(', ')}`);
      } else if (typeof fieldErrors === 'string') {
        parts.push(`${field}: ${fieldErrors}`);
      }
    }
  }

  // 4. Per-recipient rejections/statuses inside data.data array
  if (Array.isArray(data.data)) {
    for (const item of data.data) {
      if (item && typeof item === 'object') {
        const itemStatus = item.status ? String(item.status).toUpperCase() : '';
        if (itemStatus && (itemStatus.includes('FAIL') || itemStatus.includes('REJECT') || itemStatus.includes('ERROR') || itemStatus.includes('UNDELIV'))) {
          const reason = item.message || item.reason || item.error || itemStatus;
          parts.push(`Recipient ${item.recipient || ''}: ${reason}`);
        } else if (item.error) {
          parts.push(`Recipient ${item.recipient || ''}: ${item.error}`);
        }
      }
    }
  } else if (data.data && typeof data.data === 'object') {
    if (data.data.error) parts.push(String(data.data.error));
    if (data.data.message && !parts.includes(data.data.message)) parts.push(String(data.data.message));
  }

  if (parts.length > 0) {
    return parts.join(' — ');
  }

  return data.message || data.error || `SMS Gateway returned HTTP ${httpStatus}`;
}

export class SmsService {
  /**
   * Dispatches an SMS through real Arkesel API gateway with idempotency and accurate tracking.
   * Follows the workflow:
   * Logged-in Church -> Authenticated Church ID -> Firebase Church Record -> Registered Church Name -> SMS Sender Name -> SMS Provider
   */
  public static async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    const { churchId, recipientName, phone, message: rawMessage, notificationType, customSenderName, relatedContributionId, relatedReceiptNumber, memberId } = params;
    
    // Find church from Firebase
    const churches = db.get('churches');
    const church = churches.find(c => c.id === churchId);
    
    if (churchId && churchId !== 'PLATFORM' && !church) {
      throw new Error(`Church record not found in Firebase for ID "${churchId}".`);
    }

    const churchName = church ? church.name : 'Central Platform';
    const costPerUnit = church?.smsPricePerUnit || 0.05;
    
    // Check if SMS feature enabled for church
    if (church && church.features && church.features.sms === false) {
      throw new Error(`SMS messaging is currently disabled for ${churchName}. Please contact the administrator.`);
    }

    // Check Super Admin SMS Status control (Requirement 1 & 7)
    if (church && church.smsStatus === 'DISABLED') {
      const now = new Date().toISOString();
      const smsId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const disabledMsg: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        memberId: memberId || undefined,
        recipientName,
        phone,
        normalizedPhone: phone,
        senderName: church.settings?.senderName || 'CHURCH',
        message: rawMessage || '',
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Failed',
        failureReason: `SMS messaging is disabled for ${churchName} by the Super Admin.`,
        unitsDeducted: 0,
        ratePerUnitGHS: costPerUnit,
        costGHS: 0,
        sentAt: now,
        createdAt: now,
      };
      db.update('smsMessages', msgs => [disabledMsg, ...msgs]);
      await db.saveDoc('smsMessages', smsId, disabledMsg).catch(console.error);
      return { success: false, smsMessage: disabledMsg };
    }

    // Clean message body: strip unwanted prepended workspace, church, or application prefixes
    let cleanMessage = (rawMessage || '').trim();

    // Remove leading bracketed prefixes such as "[User's Workspace]", "[Workspace]", "[Church Name]", "[ChurchOS]", "[PHCI]", etc.
    cleanMessage = cleanMessage.replace(/^\[(?:User's Workspace|Workspace|Workspace Name|Church Name|ChurchOS|Church OS|BusinessOS|Business OS|Central Platform Test|[^\]]+)\]\s*[:\-]?\s*/i, (match) => {
      const inner = match.replace(/^\[|\]\s*[:\-]?\s*$/g, '').trim().toLowerCase();
      if (
        inner === "user's workspace" ||
        inner === 'workspace' ||
        inner === 'workspace name' ||
        inner === 'church name' ||
        inner === 'churchos' ||
        inner === 'church os' ||
        inner === 'businessos' ||
        inner === 'business os' ||
        inner === 'central platform test' ||
        (churchName && inner === churchName.trim().toLowerCase()) ||
        (church?.name && inner === church.name.trim().toLowerCase())
      ) {
        return '';
      }
      return match;
    });

    // Also strip unbracketed leading workspace/church identifier prefixes if prepended, e.g. "PHCI: ", "ChurchOS: "
    if (churchName) {
      const escapedChurch = churchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const prefixRegex = new RegExp(`^(?:${escapedChurch}|ChurchOS|Church OS|User's Workspace)\\s*[:\\-]\\s*`, 'i');
      cleanMessage = cleanMessage.replace(prefixRegex, '');
    }

    // Resolve personalization placeholders only if explicitly entered by the user
    const message = cleanMessage
      .replace(/\[Member Name\]/gi, recipientName)
      .replace(/\[Church Name\]/gi, churchName)
      .trim();

    // Calculate required units (GSM standard: 160 chars / Unicode: 70 chars) (Requirement 2)
    const unitsNeeded = calculateSmsUnits(message);

    // Check if SMS is disabled in church settings
    if (church && church.settings && church.settings.smsEnabled === false) {
      const now = new Date().toISOString();
      const smsId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const disabledMsg: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        memberId: memberId || undefined,
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
        unitsDeducted: 0,
        ratePerUnitGHS: costPerUnit,
        costGHS: 0,
        sentAt: now,
        createdAt: now,
      };
      db.update('smsMessages', msgs => [disabledMsg, ...msgs]);
      await db.saveDoc('smsMessages', smsId, disabledMsg).catch(console.error);
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

    // Check existing messages for duplicate prevention (only consider successfully delivered/submitted messages)
    const existingMessages = db.get('smsMessages');
    const duplicate = existingMessages.find(m => m.idempotencyKey === key && m.churchId === churchId && (m.status === 'Delivered' || m.status === 'Submitted'));
    if (duplicate) {
      console.log(`[SMS-Service] Idempotency match: Duplicate prevented for key "${key}"`);
      return {
        success: true,
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
        memberId: memberId || undefined,
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

    // Ensure church has positive SMS credit balance when using platform credits (Requirement 2 & 8)
    if (church && !churchApiKey) {
      let churchCredits = (church.smsCredits !== undefined && church.smsCredits !== null) ? church.smsCredits : 500;
      if (church.smsCredits === undefined || church.smsCredits === null) {
        church.smsCredits = 500;
        church.smsAllocatedUnits = 500;
        church.smsUnitsUsed = 0;
        db.saveDoc('churches', churchId, { ...church, smsCredits: 500, smsAllocatedUnits: 500, smsUnitsUsed: 0 }).catch(console.error);
      }

      if (churchCredits < unitsNeeded) {
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
          failureReason: `Insufficient SMS units: Message requires ${unitsNeeded} units, but ${churchName} has only ${churchCredits} units remaining. Please contact the Super Admin to add SMS units.`,
          unitsDeducted: 0,
          ratePerUnitGHS: costPerUnit,
          costGHS: 0,
          idempotencyKey: key,
          sentAt: now,
          createdAt: now,
        };

        db.update('smsMessages', msgs => [outOfBalanceMsg, ...msgs]);
        await db.saveDoc('smsMessages', smsId, outOfBalanceMsg).catch(console.error);
        return { success: false, smsMessage: outOfBalanceMsg };
      }
    }

    // Check central platform credit balance only if church is NOT using their own API key
    if (!churchApiKey && platformSettings.balanceCredits <= 0) {
      const outOfBalanceMsg: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        memberId: memberId || undefined,
        recipientName,
        phone,
        normalizedPhone: norm.normalized,
        senderName,
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Failed',
        failureReason: 'Central Gateway SMS Credit Balance Exhausted. Please contact the Super Admin or configure your own Gateway API key in SMS Settings.',
        unitsDeducted: 0,
        ratePerUnitGHS: costPerUnit,
        costGHS: 0,
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [outOfBalanceMsg, ...msgs]);
      await db.saveDoc('smsMessages', smsId, outOfBalanceMsg).catch(console.error);
      return { success: false, smsMessage: outOfBalanceMsg };
    }

    // When API key is not yet configured, dispatch via Central Platform Sandbox Gateway
    // to allow church testing, reminders, and notifications without blocking workflow
    if (!apiKey) {
      if (church && !churchApiKey) {
        const updatedCredits = Math.max(0, (church.smsCredits ?? 500) - unitsNeeded);
        const updatedUnitsUsed = (church.smsUnitsUsed ?? 0) + unitsNeeded;
        church.smsCredits = updatedCredits;
        church.smsUnitsUsed = updatedUnitsUsed;
        db.update('churches', list =>
          list.map(c => (c.id === churchId ? { ...c, smsCredits: updatedCredits, smsUnitsUsed: updatedUnitsUsed } : c))
        );
        await db.saveDoc('churches', churchId, { ...church, smsCredits: updatedCredits, smsUnitsUsed: updatedUnitsUsed }).catch(console.error);
      }

      db.update('platformSettings', settings => ({
        ...settings,
        balanceCredits: Math.max(0, (settings.balanceCredits || 500) - unitsNeeded),
        totalSmsDispatched: (settings.totalSmsDispatched || 0) + 1,
      }));

      const providerMessageId = `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const detectedNetwork = getGhanaianNetwork(norm.normalized).network;
      const submittedMessage: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        memberId: memberId || undefined,
        recipientName,
        phone,
        normalizedPhone: norm.normalized,
        recipientPhone: norm.normalized,
        recipientNetwork: detectedNetwork,
        senderName,
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Submitted',
        unitsDeducted: unitsNeeded,
        ratePerUnitGHS: costPerUnit,
        costGHS: Number((unitsNeeded * costPerUnit).toFixed(4)),
        providerResponse: 'SUBMITTED_SANDBOX (Central Sandbox Gateway - configure Arkesel API key in settings for live cellular network delivery)',
        gatewayResponse: JSON.stringify({ status: 'submitted', mode: 'sandbox', id: providerMessageId, network: detectedNetwork }),
        providerMessageId,
        arkeselMessageId: providerMessageId,
        idempotencyKey: key,
        submittedAt: now,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [submittedMessage, ...msgs]);
      await db.saveDoc('smsMessages', smsId, submittedMessage).catch(console.error);

      // Record audit log
      db.update('auditLogs', logs => [
        {
          id: `aud_${Date.now()}`,
          churchId,
          userId: 'system',
          userName: `${churchName} Communications`,
          action: 'SMS_SUBMITTED',
          details: `Submitted ${notificationType} to ${recipientName} (${norm.normalized}, ${detectedNetwork}). Deducted ${unitsNeeded} units. Gateway: Sandbox Gateway (${providerMessageId})`,
          timestamp: now,
        },
        ...logs.slice(0, 499),
      ]);

      return { success: true, smsMessage: submittedMessage };
    }

    // Real Gateway call
    try {
      const endpoint = gateway === 'Arkesel' ? 'https://sms.arkesel.com/api/v2/sms/send' : (platformSettings.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send');
      const cleanPhone = norm.normalized.replace(/^\+/, '');

      // Resolve callback URL for delivery webhook notifications if public URL is configured
      const webhookBase = process.env.PUBLIC_APP_URL || process.env.APP_URL;
      const callbackUrl = webhookBase ? `${webhookBase.replace(/\/$/, '')}/api/webhooks/arkesel` : undefined;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const requestPayload: Record<string, any> = {
        sender: senderName,
        message,
        recipients: [cleanPhone],
      };
      if (callbackUrl) {
        requestPayload.callback_url = callbackUrl;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data: any = await response.json().catch(() => null);

      // Check for gateway acceptance and per-recipient rejection
      let isGatewaySuccess = false;
      let recipientRejectionReason: string | undefined = undefined;

      if (response.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000')) {
        // Arkesel returns an array of recipients in data.data
        if (Array.isArray(data?.data) && data.data.length > 0) {
          const firstRecipient = data.data[0];
          const recipStatus = firstRecipient?.status ? String(firstRecipient.status).toUpperCase() : '';
          if (recipStatus && (recipStatus.includes('FAIL') || recipStatus.includes('REJECT') || recipStatus.includes('ERROR') || recipStatus.includes('UNDELIV'))) {
            isGatewaySuccess = false;
            recipientRejectionReason = firstRecipient.message || firstRecipient.reason || firstRecipient.error || `Recipient rejected by gateway (Status: ${recipStatus})`;
          } else {
            isGatewaySuccess = true;
          }
        } else {
          isGatewaySuccess = true;
        }
      }

      const detectedNetwork = getGhanaianNetwork(norm.normalized).network;

      if (isGatewaySuccess) {
        const providerMessageId = data?.data?.[0]?.id || data?.data?.id || data?.id || `ARK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const remainingSms = typeof data?.sms_balance === 'number' ? data.sms_balance : undefined;

        // Deduct platform credit only if not using own direct API key
        if (!churchApiKey) {
          db.update('platformSettings', settings => ({
            ...settings,
            balanceCredits: remainingSms !== undefined ? remainingSms : Math.max(0, settings.balanceCredits - unitsNeeded),
            totalSmsDispatched: (settings.totalSmsDispatched || 0) + 1,
            connectionStatus: 'Connected',
          }));

          // Deduct church's assigned SMS unit credit (Requirement 2)
          if (church) {
            const updatedCredits = Math.max(0, (church.smsCredits ?? 0) - unitsNeeded);
            const updatedUnitsUsed = (church.smsUnitsUsed ?? 0) + unitsNeeded;
            church.smsCredits = updatedCredits;
            church.smsUnitsUsed = updatedUnitsUsed;
            db.update('churches', list =>
              list.map(c => (c.id === churchId ? { ...c, smsCredits: updatedCredits, smsUnitsUsed: updatedUnitsUsed } : c))
            );
            await db.saveDoc('churches', churchId, { ...church, smsCredits: updatedCredits, smsUnitsUsed: updatedUnitsUsed }).catch(console.error);
          }
        }

        // CRITICAL:
        // Do Not Treat API Acceptance as Delivery!
        // When Arkesel accepts the SMS request, record it as:
        // - Submitted / Pending delivery
        // Only mark an SMS as Delivered after Arkesel provides an actual delivery confirmation.
        const submittedMessage: SmsMessage = {
          id: smsId,
          churchId,
          churchName,
          memberId: memberId || undefined,
          recipientName,
          phone,
          normalizedPhone: norm.normalized,
          recipientPhone: norm.normalized,
          recipientNetwork: detectedNetwork,
          senderName,
          message,
          notificationType,
          relatedContributionId,
          relatedReceiptNumber,
          status: 'Submitted',
          unitsDeducted: unitsNeeded,
          ratePerUnitGHS: costPerUnit,
          costGHS: Number((unitsNeeded * costPerUnit).toFixed(4)),
          providerResponse: data?.message || 'SUBMITTED_TO_GATEWAY',
          gatewayResponse: JSON.stringify(data),
          providerMessageId,
          arkeselMessageId: providerMessageId,
          idempotencyKey: key,
          submittedAt: now,
          sentAt: now,
          createdAt: now,
        };

        db.update('smsMessages', msgs => [submittedMessage, ...msgs]);
        await db.saveDoc('smsMessages', smsId, submittedMessage).catch(console.error);

        // Required Console Logging: normalized number → Arkesel response → final status
        console.log(`[SMS-Dispatch] ${norm.normalized} (${detectedNetwork}) → Arkesel response: ${JSON.stringify(data)} → Final status: Submitted (In Transit)`);

        // Record audit log
        db.update('auditLogs', logs => [
          {
            id: `aud_${Date.now()}`,
            churchId,
            userId: 'system',
            userName: `${churchName} Communications`,
            action: 'SMS_SUBMITTED',
            details: `Submitted ${notificationType} to ${recipientName} (${norm.normalized}, ${detectedNetwork}). Deducted ${unitsNeeded} units. Awaiting delivery confirmation. Provider Ref: ${providerMessageId}`,
            timestamp: now,
          },
          ...logs.slice(0, 499),
        ]);

        return { success: true, smsMessage: submittedMessage };
      } else {
        const failureReason = recipientRejectionReason || extractDetailedArkeselError(data, response.status);

        const failedMessage: SmsMessage = {
          id: smsId,
          churchId,
          churchName,
          memberId: memberId || undefined,
          recipientName,
          phone,
          normalizedPhone: norm.normalized,
          recipientPhone: norm.normalized,
          recipientNetwork: detectedNetwork,
          senderName,
          message,
          notificationType,
          relatedContributionId,
          relatedReceiptNumber,
          status: 'Failed',
          failureReason,
          providerResponse: data?.message || `GATEWAY_ERROR_${response.status}`,
          gatewayResponse: JSON.stringify(data || { httpStatus: response.status, error: failureReason }),
          unitsDeducted: 0,
          ratePerUnitGHS: costPerUnit,
          costGHS: 0,
          idempotencyKey: key,
          sentAt: now,
          createdAt: now,
        };

        db.update('smsMessages', msgs => [failedMessage, ...msgs]);
        await db.saveDoc('smsMessages', smsId, failedMessage).catch(console.error);

        // Required Console Logging: normalized number → Arkesel response → final status
        console.error(`[SMS-Dispatch] ${norm.normalized} (${detectedNetwork}) → Arkesel response: ${JSON.stringify(data || { httpStatus: response.status, error: failureReason })} → Final status: Failed (${failureReason})`);

        return { success: false, smsMessage: failedMessage };
      }
    } catch (err: any) {
      const failureReason = err.name === 'AbortError' ? 'Connection timed out connecting to SMS gateway after 25s.' : (err.message || 'SMS dispatch failed');
      const detectedNetwork = getGhanaianNetwork(norm.normalized).network;

      const failedMessage: SmsMessage = {
        id: smsId,
        churchId,
        churchName,
        memberId: memberId || undefined,
        recipientName,
        phone,
        normalizedPhone: norm.normalized,
        recipientPhone: norm.normalized,
        recipientNetwork: detectedNetwork,
        senderName,
        message,
        notificationType,
        relatedContributionId,
        relatedReceiptNumber,
        status: 'Failed',
        failureReason,
        gatewayResponse: JSON.stringify({ error: failureReason, exception: err.name || 'Error' }),
        unitsDeducted: 0,
        ratePerUnitGHS: costPerUnit,
        costGHS: 0,
        idempotencyKey: key,
        sentAt: now,
        createdAt: now,
      };

      db.update('smsMessages', msgs => [failedMessage, ...msgs]);
      await db.saveDoc('smsMessages', smsId, failedMessage).catch(console.error);

      // Required Console Logging: normalized number → Arkesel response → final status
      console.error(`[SMS-Dispatch] ${norm.normalized} (${detectedNetwork}) → Arkesel response: EXCEPTION (${err.name || 'Error'}: ${err.message}) → Final status: Failed (${failureReason})`);

      return { success: false, smsMessage: failedMessage };
    }
  }

  /**
   * Process Delivery Status Callback / Webhook from SMS Gateway (Arkesel DLR)
   */
  public static async processDeliveryCallback(payload: any): Promise<{ success: boolean; message: string; updatedId?: string; status?: SmsStatus }> {
    console.log('[SMS DLR Webhook Received]', JSON.stringify(payload));
    if (!payload || typeof payload !== 'object') {
      return { success: false, message: 'Invalid payload received' };
    }

    // Extract identifiers from various formats Arkesel or gateway might send
    const messageId = String(payload.sms_id || payload.id || payload.message_id || payload.msg_id || payload.messageId || '').trim();
    const rawStatus = String(payload.status || payload.delivery_status || payload.dlr_status || '').trim();
    const recipient = String(payload.recipient || payload.to || payload.phone || '').trim();
    const network = String(payload.network || payload.carrier || '').trim();
    const failureReason = payload.reason || payload.error || payload.error_message;

    if (!messageId && !recipient) {
      return { success: false, message: 'Missing message ID or recipient in delivery callback' };
    }

    const allMessages = db.get('smsMessages');
    // Find matching message by providerMessageId, arkeselMessageId, or id, and optionally recipient
    const match = allMessages.find(m => {
      if (messageId && (m.arkeselMessageId === messageId || m.providerMessageId === messageId || m.id === messageId)) {
        return true;
      }
      if (recipient && !messageId) {
        const norm = normalizePhoneNumber(recipient);
        return (m.recipientPhone === norm.normalized || m.phone === recipient) && (m.status === 'Submitted' || m.status === 'Pending');
      }
      return false;
    });

    if (!match) {
      console.warn(`[SMS DLR Webhook] No matching SMS message found for ID: ${messageId}, Recipient: ${recipient}`);
      return { success: false, message: `No matching SMS message found for reference ${messageId || recipient}` };
    }

    const mappedStatus = mapArkeselDeliveryStatus(rawStatus).status;
    const now = new Date().toISOString();

    const updatedMessage: SmsMessage = {
      ...match,
      status: mappedStatus,
      gatewayResponse: JSON.stringify(payload),
      recipientNetwork: network || match.recipientNetwork,
      deliveredAt: mappedStatus === 'Delivered' ? (match.deliveredAt || now) : match.deliveredAt,
      failedAt: (mappedStatus === 'Failed' || mappedStatus === 'Undelivered' || mappedStatus === 'Rejected') ? (match.failedAt || now) : match.failedAt,
      failureReason: (mappedStatus === 'Failed' || mappedStatus === 'Undelivered' || mappedStatus === 'Rejected') ? (failureReason || `Gateway status: ${rawStatus}`) : match.failureReason,
    };

    db.update('smsMessages', msgs => msgs.map(m => (m.id === match.id ? updatedMessage : m)));
    await db.saveDoc('smsMessages', match.id, updatedMessage).catch(console.error);

    // Audit log
    db.update('auditLogs', logs => [
      {
        id: `aud_${Date.now()}`,
        churchId: match.churchId,
        userId: 'webhook',
        userName: 'SMS Gateway DLR',
        action: `SMS_${mappedStatus.toUpperCase()}`,
        details: `Delivery report for ${match.recipientName} (${match.recipientPhone || match.phone}): Status transitioned to ${mappedStatus}. Provider Ref: ${messageId}`,
        timestamp: now,
      },
      ...logs.slice(0, 499),
    ]);

    return {
      success: true,
      message: `Updated message ${match.id} to ${mappedStatus}`,
      updatedId: match.id,
      status: mappedStatus,
    };
  }

  /**
   * Reconcile status of pending/submitted SMS messages with Arkesel Gateway
   */
  public static async reconcilePendingMessages(churchId?: string): Promise<{ checked: number; updated: number; messages: { id: string; status: SmsStatus; recipient: string }[] }> {
    const platformSettings = db.get('platformSettings');
    const apiKey = (platformSettings.apiKey || process.env.ARKESEL_API_KEY || '').trim();

    const allMessages = db.get('smsMessages');
    const pending = allMessages.filter(m => 
      (!churchId || m.churchId === churchId) && 
      (m.status === 'Submitted' || m.status === 'Pending')
    );

    let updatedCount = 0;
    const results: { id: string; status: SmsStatus; recipient: string }[] = [];

    for (const msg of pending) {
      // Live Arkesel gateway check if API key exists and message has an Arkesel Message ID
      const church = msg.churchId ? db.get('churches').find(c => c.id === msg.churchId) : null;
      const effectiveApiKey = (church?.settings?.smsApiKey || (church?.settings as any)?.apiKey || apiKey || '').trim();

      if (effectiveApiKey && msg.arkeselMessageId && !msg.providerMessageId?.startsWith('SIM-')) {
        try {
          const checkRes = await this.checkSingleMessageStatus(msg.id, msg.churchId);
          if (checkRes.success && checkRes.mappedStatus && checkRes.mappedStatus !== msg.status) {
            updatedCount++;
            results.push({ id: msg.id, status: checkRes.mappedStatus, recipient: msg.recipientPhone || msg.phone || '' });
          }
        } catch (err) {
          console.warn(`Failed to reconcile status for SMS ${msg.id}:`, err);
        }
      }
    }

    return {
      checked: pending.length,
      updated: updatedCount,
      messages: results,
    };
  }

  /**
   * Check live carrier delivery status for a single SMS message with Arkesel Gateway
   */
  public static async checkSingleMessageStatus(
    messageIdOrProviderId: string,
    churchId?: string
  ): Promise<{
    success: boolean;
    smsMessage?: SmsMessage;
    rawStatus?: string;
    mappedStatus?: SmsStatus;
    httpStatus?: number;
    rawResponse?: any;
    error?: string;
  }> {
    const allMessages = db.get('smsMessages');
    const msg = allMessages.find(
      m => (m.id === messageIdOrProviderId || m.arkeselMessageId === messageIdOrProviderId || m.providerMessageId === messageIdOrProviderId) &&
           (!churchId || m.churchId === churchId)
    );

    if (!msg) {
      return { success: false, error: `SMS record not found: ${messageIdOrProviderId}` };
    }

    const church = msg.churchId ? db.get('churches').find(c => c.id === msg.churchId) : null;
    const platformSettings = db.get('platformSettings');
    const apiKey = (church?.settings?.smsApiKey || (church?.settings as any)?.apiKey || platformSettings.apiKey || process.env.ARKESEL_API_KEY || '').trim();

    if (!apiKey) {
      return { success: false, error: 'Arkesel API key is not configured.' };
    }

    const arkeselId = msg.arkeselMessageId || msg.providerMessageId;
    if (!arkeselId || arkeselId.startsWith('SIM-')) {
      return { success: false, error: 'No gateway message ID available for this record.' };
    }

    // Try candidate Arkesel V2 status check endpoints
    const candidateUrls = [
      `https://sms.arkesel.com/api/v2/sms/${encodeURIComponent(arkeselId)}`,
      `https://sms.arkesel.com/api/v2/sms/details?message_id=${encodeURIComponent(arkeselId)}`,
      `https://sms.arkesel.com/api/v2/sms?sms_id=${encodeURIComponent(arkeselId)}`,
    ];

    let lastData: any = null;
    let lastHttpStatus = 0;
    let foundReport: any = null;
    let rawStatus: string | undefined = undefined;

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'api-key': apiKey,
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        lastHttpStatus = resp.status;

        const text = await resp.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { rawText: text };
        }
        lastData = parsed;

        console.log(`[Arkesel Status Check] URL: ${url} → HTTP ${resp.status}`, JSON.stringify(parsed));

        if (resp.ok) {
          const report = parsed?.data ? (Array.isArray(parsed.data) ? parsed.data[0] : parsed.data) : parsed;
          const statusVal = report?.status || report?.STATUS || report?.delivery_status || parsed?.status;
          if (statusVal && typeof statusVal === 'string' && statusVal.toLowerCase() !== 'success') {
            foundReport = report;
            rawStatus = statusVal;
            break;
          } else if (report && typeof report === 'object') {
            foundReport = report;
            rawStatus = statusVal || report?.status;
            if (rawStatus && rawStatus.toLowerCase() !== 'success') break;
          }
        }
      } catch (err: any) {
        console.warn(`[Arkesel Status Check Error] ${url}:`, err.message);
      }
    }

    if (!rawStatus && foundReport?.status) {
      rawStatus = foundReport.status;
    }

    const now = new Date().toISOString();
    let mappedStatus: SmsStatus = msg.status;
    let failureReason = msg.failureReason;

    if (rawStatus) {
      const mapped = mapArkeselDeliveryStatus(rawStatus);
      mappedStatus = mapped.status;
      if (mappedStatus === 'Failed' || mappedStatus === 'Undelivered') {
        failureReason = foundReport?.reason || foundReport?.error || foundReport?.error_message || foundReport?.rejection_reason || `Carrier reported status: ${rawStatus}`;
      } else {
        failureReason = undefined;
      }
    }

    const updated: SmsMessage = {
      ...msg,
      status: mappedStatus,
      deliveredAt: mappedStatus === 'Delivered' ? (msg.deliveredAt || now) : msg.deliveredAt,
      failedAt: (mappedStatus === 'Failed' || mappedStatus === 'Undelivered') ? (msg.failedAt || now) : msg.failedAt,
      failureReason,
      gatewayResponse: JSON.stringify(lastData),
    };

    db.update('smsMessages', msgs => msgs.map(m => (m.id === msg.id ? updated : m)));
    await db.saveDoc('smsMessages', msg.id, updated).catch(console.error);

    return {
      success: true,
      smsMessage: updated,
      rawStatus,
      mappedStatus,
      httpStatus: lastHttpStatus,
      rawResponse: lastData,
    };
  }

  /**
   * Verify Arkesel Gateway API credentials & check live carrier balance.
   * Connects to https://sms.arkesel.com/api/v2/clients/balance-details without sending an SMS.
   * /
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

      // Inspect for gateway rejection or per-recipient rejection
      let isGatewaySuccess = false;
      let recipientRejectionReason: string | undefined = undefined;

      if (response.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000')) {
        if (Array.isArray(data?.data) && data.data.length > 0) {
          const firstRecipient = data.data[0];
          const recipStatus = firstRecipient?.status ? String(firstRecipient.status).toUpperCase() : '';
          if (recipStatus && (recipStatus.includes('FAIL') || recipStatus.includes('REJECT') || recipStatus.includes('ERROR') || recipStatus.includes('UNDELIV'))) {
            isGatewaySuccess = false;
            recipientRejectionReason = firstRecipient.message || firstRecipient.reason || firstRecipient.error || `Recipient rejected: ${recipStatus}`;
          } else {
            isGatewaySuccess = true;
          }
        } else {
          isGatewaySuccess = true;
        }
      }

      const detectedNetwork = getGhanaianNetwork(norm.normalized).network;

      if (isGatewaySuccess) {
        const remainingSms = typeof data?.sms_balance === 'number' ? data.sms_balance : undefined;
        const providerMessageId = data?.data?.[0]?.id || data?.data?.id || data?.id || `ARK-TEST-${Date.now()}`;
        const now = new Date().toISOString();

        db.update('platformSettings', settings => ({
          ...settings,
          balanceCredits: remainingSms !== undefined ? remainingSms : Math.max(0, settings.balanceCredits - 1),
          totalSmsDispatched: (settings.totalSmsDispatched || 0) + 1,
          connectionStatus: 'Connected',
          hasApiKey: true,
        }));

        // Record test message in SMS history so it can be tracked and reconciled
        const testSmsId = `sms_test_${Date.now()}`;
        const testRecord: SmsMessage = {
          id: testSmsId,
          churchId: 'PLATFORM',
          churchName: 'Central Platform Test',
          recipientName: `Super Admin Test (${detectedNetwork})`,
          phone: testPhone,
          normalizedPhone: norm.normalized,
          recipientPhone: norm.normalized,
          recipientNetwork: detectedNetwork,
          senderName: sender,
          message: msg,
          notificationType: 'TEST',
          status: 'Submitted',
          unitsDeducted: 1,
          ratePerUnitGHS: 0.035,
          costGHS: 0.035,
          providerResponse: data?.message || 'SUBMITTED_TO_GATEWAY',
          gatewayResponse: JSON.stringify(data),
          providerMessageId,
          arkeselMessageId: providerMessageId,
          submittedAt: now,
          sentAt: now,
          createdAt: now,
        };
        db.update('smsMessages', msgs => [testRecord, ...msgs]);
        await db.saveDoc('smsMessages', testSmsId, testRecord).catch(console.error);

        console.log(`[SMS-Test] ${norm.normalized} (${detectedNetwork}) → Arkesel response: ${JSON.stringify(data)} → Final status: Submitted (In Transit)`);

        return {
          success: true,
          message: `SMS test submitted successfully to Arkesel gateway for ${detectedNetwork} (${norm.normalized}). Awaiting carrier delivery confirmation.`,
          details: {
            recipient: norm.normalized,
            network: detectedNetwork,
            status: 'Submitted',
            providerMessageId,
            providerResponse: data?.message || 'SUBMITTED_TO_GATEWAY',
            smsBalance: data?.sms_balance,
            gatewayResponse: data,
          },
        };
      } else {
        const failureReason = recipientRejectionReason || extractDetailedArkeselError(data, response.status);
        db.update('platformSettings', settings => ({
          ...settings,
          connectionStatus: 'Disconnected',
        }));

        console.error(`[SMS-Test] ${norm.normalized} (${detectedNetwork}) → Arkesel response: ${JSON.stringify(data || { httpStatus: response.status, error: failureReason })} → Final status: Failed (${failureReason})`);

        return {
          success: false,
          message: `Arkesel Gateway Error: ${failureReason}`,
          details: {
            failureReason,
            rawGatewayResponse: data,
            httpStatus: response.status,
          },
        };
      }
    } catch (err: any) {
      db.update('platformSettings', settings => ({
        ...settings,
        connectionStatus: 'Disconnected',
      }));

      const errorMsg = err.name === 'AbortError' ? 'Connection timed out connecting to Arkesel SMS gateway after 25s.' : (err.message || 'SMS test request failed');
      console.error(`[SMS-Test] ${norm.normalized} → Arkesel response: EXCEPTION (${err.name || 'Error'}: ${err.message}) → Final status: Failed`);
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
      "Dear [Member Name], we missed you in fellowship today. We hope you are well and look forward to worshipping with you again.";

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
      messageBody = `Dear ${recipientName}, your ${record.givingType} of ${currencyStr} ${amountStr} has been successfully recorded on ${dateStr}. Ref: ${receiptRef}. Thank you and God bless you.`;
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
    const churchName = church?.name || 'Church';
    const effectiveSender = (senderId || deriveSenderIdFromChurchName(churchName)).slice(0, 11);
    const cleanPhone = norm.normalized.replace(/^\+/, '');
    const testMsg = `SMS gateway test successful. Your SMS configuration is active and working.`;

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

      let isGatewaySuccess = false;
      let recipientRejectionReason: string | undefined = undefined;

      if (response.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000')) {
        if (Array.isArray(data?.data) && data.data.length > 0) {
          const firstRecipient = data.data[0];
          const recipStatus = firstRecipient?.status ? String(firstRecipient.status).toUpperCase() : '';
          if (recipStatus && (recipStatus.includes('FAIL') || recipStatus.includes('REJECT') || recipStatus.includes('ERROR') || recipStatus.includes('UNDELIV'))) {
            isGatewaySuccess = false;
            recipientRejectionReason = firstRecipient.message || firstRecipient.reason || firstRecipient.error || `Recipient rejected: ${recipStatus}`;
          } else {
            isGatewaySuccess = true;
          }
        } else {
          isGatewaySuccess = true;
        }
      }

      const detectedNetwork = getGhanaianNetwork(norm.normalized).network;

      if (isGatewaySuccess) {
        console.log(`[SMS-ChurchTest] ${norm.normalized} (${detectedNetwork}) → Arkesel response: ${JSON.stringify(data)} → Final status: Submitted (In Transit)`);
        return {
          success: true,
          message: `Gateway connection verified! Test SMS successfully sent to ${norm.normalized} (${detectedNetwork}) with Sender ID "${effectiveSender}".`,
          details: data,
        };
      } else {
        const errMsg = recipientRejectionReason || extractDetailedArkeselError(data, response.status);
        console.error(`[SMS-ChurchTest] ${norm.normalized} (${detectedNetwork}) → Arkesel response: ${JSON.stringify(data || { httpStatus: response.status, error: errMsg })} → Final status: Failed (${errMsg})`);
        return {
          success: false,
          message: `SMS Gateway rejected test: ${errMsg}`,
          details: data,
        };
      }
    } catch (err: any) {
      const errMsg = err.name === 'AbortError' ? 'Connection timed out connecting to SMS gateway after 20s.' : (err.message || 'Connection test failed');
      console.error(`[SMS-ChurchTest] ${norm.normalized} → Arkesel response: EXCEPTION (${err.name || 'Error'}: ${err.message}) → Final status: Failed`);
      return {
        success: false,
        message: `Network error connecting to SMS Gateway: ${errMsg}`,
        details: errMsg,
      };
    }
  }
}
