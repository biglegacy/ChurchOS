/**
 * Phone number normalization and validation utilities
 * Specialized for Ghanaian (+233) mobile networks (MTN, Vodafone/Telecel, AirtelTigo)
 * and international E.164 phone formats.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
  network?: string;
}

export function normalizePhoneNumber(input: string | undefined | null): PhoneValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      normalized: '',
      error: 'This member does not have a registered phone number.',
    };
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
      return {
        isValid: false,
        normalized: cleaned,
        error: 'Phone number contains non-digit characters.',
      };
    }
    // Check if it's +2330... which is a common formatting error for Ghana
    if (cleaned.startsWith('+2330')) {
      cleaned = '+233' + cleaned.slice(5);
    }
    if (cleaned.length >= 9 && cleaned.length <= 16) {
      return {
        isValid: true,
        normalized: cleaned,
        network: detectGhanaNetwork(cleaned),
      };
    }
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Phone number length must be between 9 and 15 digits.',
    };
  }

  // If starts with 0 (e.g. 024XXXXXXX or 050XXXXXXX, standard Ghana 10-digit mobile)
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.slice(1);
    if (/^\d{9}$/.test(withoutZero)) {
      const normalized = `+233${withoutZero}`;
      return {
        isValid: true,
        normalized,
        network: detectGhanaNetwork(normalized),
      };
    }
    if (/^\d{8,14}$/.test(withoutZero)) {
      const normalized = `+233${withoutZero}`;
      return {
        isValid: true,
        normalized,
        network: detectGhanaNetwork(normalized),
      };
    }
  }

  // If starts with 233
  if (cleaned.startsWith('233')) {
    const afterCode = cleaned.slice(3);
    if (afterCode.startsWith('0')) {
      const proper = afterCode.slice(1);
      if (/^\d{8,10}$/.test(proper)) {
        const normalized = `+233${proper}`;
        return {
          isValid: true,
          normalized,
          network: detectGhanaNetwork(normalized),
        };
      }
    } else if (/^\d{8,10}$/.test(afterCode)) {
      const normalized = `+233${afterCode}`;
      return {
        isValid: true,
        normalized,
        network: detectGhanaNetwork(normalized),
      };
    }
  }

  // Generic 9 digits check (without leading 0 -> Ghana standard)
  if (/^\d{9}$/.test(cleaned)) {
    const normalized = `+233${cleaned}`;
    return {
      isValid: true,
      normalized,
      network: detectGhanaNetwork(normalized),
    };
  }

  // Generic 10-15 digits without plus -> treat as international standard
  if (/^\d{10,15}$/.test(cleaned)) {
    return {
      isValid: true,
      normalized: `+${cleaned}`,
    };
  }

  return {
    isValid: false,
    normalized: cleaned,
    error: 'Please enter a valid phone number (e.g. 0241234567 or +233241234567).',
  };
}

export function detectGhanaNetwork(normalizedPhone: string): string {
  if (!normalizedPhone.startsWith('+233')) return 'International';
  const prefix = normalizedPhone.slice(4, 6);
  // MTN: 24, 54, 55, 59, 53
  if (['24', '54', '55', '59', '53'].includes(prefix)) return 'MTN Ghana';
  // Telecel / Vodafone: 20, 50
  if (['20', '50'].includes(prefix)) return 'Telecel Ghana';
  // AT / AirtelTigo: 27, 57, 26
  if (['27', '57', '26'].includes(prefix)) return 'AT Ghana';
  return 'Ghana Mobile';
}

export function formatPhoneForDisplay(rawPhone: string | undefined | null): string {
  if (!rawPhone || !rawPhone.trim()) return 'No registered phone';
  const norm = normalizePhoneNumber(rawPhone);
  if (norm.isValid) {
    // Format +233 24 123 4567
    if (norm.normalized.startsWith('+233') && norm.normalized.length === 13) {
      const p = norm.normalized;
      return `${p.slice(0, 4)} ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9)}`;
    }
    return norm.normalized;
  }
  return rawPhone;
}
