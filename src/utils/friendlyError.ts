/**
 * Translates raw technical, network, HTTP, or database error messages into
 * respectful, simple, church-friendly messages.
 *
 * Church users must never see technical developer messages such as:
 * - HTTP status codes (e.g. 405, 500)
 * - Firebase internal errors (e.g. FirebaseError: permission-denied)
 * - Cloudflare proxy messages
 * - Stack traces or internal function names
 * - "Failed to fetch /api/..."
 */

export function toFriendlyErrorMessage(rawError: any, endpoint?: string): string {
  if (!rawError) {
    return 'Unable to complete the request. Please try again.';
  }

  const status = typeof rawError.status === 'number' ? rawError.status : undefined;
  const msg = typeof rawError === 'string'
    ? rawError
    : (rawError.message || rawError.error || rawError.toString() || '');

  const lower = msg.toLowerCase();
  const lowerEndpoint = (endpoint || '').toLowerCase();

  // 1. Permission / Authorization errors
  if (
    status === 403 ||
    lower.includes('permission') ||
    lower.includes('access denied') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('permission-denied')
  ) {
    return 'You do not have permission to perform this action. Please contact your church administrator.';
  }

  // 2. Authentication / Session expiration
  if (
    status === 401 ||
    lower.includes('session expired') ||
    lower.includes('token expired') ||
    lower.includes('log in again')
  ) {
    return 'Your session has expired. Please log in again to continue.';
  }

  // 3. Method Not Allowed / 405
  if (status === 405 || lower.includes('405') || lower.includes('method not allowed')) {
    return 'Unable to complete the request. Please try again.';
  }

  // 4. Not Found / 404
  if (status === 404 || lower.includes('not found')) {
    if (lowerEndpoint.includes('member')) return 'The requested member could not be found.';
    if (lowerEndpoint.includes('giving')) return 'The requested contribution record could not be found.';
    if (lowerEndpoint.includes('role')) return 'The requested role could not be found.';
    return 'The requested record could not be found.';
  }

  // 5. Network / Fetch failures
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('unable to connect') ||
    lower.includes('networkerror')
  ) {
    if (lowerEndpoint.includes('members')) return 'We could not load the members. Please try again.';
    if (lowerEndpoint.includes('attendance')) return 'We could not load the attendance records. Please try again.';
    if (lowerEndpoint.includes('giving') || lowerEndpoint.includes('finance')) return 'We could not load the giving records. Please try again.';
    if (lowerEndpoint.includes('dashboard')) return 'We could not load the church dashboard. Please try again.';
    if (lowerEndpoint.includes('sms')) return 'We could not connect to the SMS service. Please try again.';
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // 6. Server / Cloudflare / 500-series errors
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes('cloudflare') ||
    lower.includes('internal server error') ||
    lower.includes('bad gateway') ||
    lower.includes('service unavailable')
  ) {
    return 'Unable to complete the request right now. Please try again in a moment.';
  }

  // 7. Validation / conflict / business errors
  if (lower.includes('already exists') || lower.includes('already taken') || lower.includes('duplicate')) {
    return msg.replace(/^Error:\s*/i, '');
  }

  // 8. Strip technical prefixes if present
  let sanitized = msg
    .replace(/^Error:\s*/i, '')
    .replace(/FirebaseError:\s*/gi, '')
    .replace(/HTTP \d{3}:?\s*/gi, '')
    .replace(/Request failed with status \d{3}/gi, 'Unable to complete the request. Please try again.');

  // If after sanitization it contains technical jargon, return generic friendly message
  if (
    sanitized.includes('at ') ||
    sanitized.includes('TypeError') ||
    sanitized.includes('SyntaxError') ||
    sanitized.includes('JSON') ||
    sanitized.includes('undefined is not') ||
    sanitized.includes('null is not') ||
    sanitized.includes('localhost') ||
    sanitized.includes('http://') ||
    sanitized.includes('https://')
  ) {
    return 'Unable to complete the request. Please try again.';
  }

  return sanitized || 'Unable to complete the request. Please try again.';
}
