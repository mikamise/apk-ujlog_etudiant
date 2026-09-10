/**
 * Security Audit Logger for UJLOG Platform.
 * Logs security-relevant events while systematically masking sensitive credentials, tokens, and PII.
 */

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_RATE_LIMIT_TRIGGERED'
  | 'AUTH_REGISTER_SUCCESS'
  | 'AUTH_REGISTER_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_ACCESS_DENIED'
  | 'AUTH_PASSWORD_CHANGE_SUCCESS'
  | 'AUTH_PASSWORD_CHANGE_FAILURE'
  | 'AUTH_PASSWORD_RESET_REQUEST'
  | 'AUTH_PASSWORD_RESET_SUCCESS'
  | 'AUTH_PASSWORD_RESET_FAILURE'
  | 'PERMISSION_DENIED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_CHANGE_FAILURE'
  | 'PROFILE_UPDATED'
  | 'ROLE_INVITATION_CREATED'
  | 'ROLE_INVITATION_ACCEPTED'
  | 'ROLE_INVITATION_INVALID'
  | 'SYSTEM_ERROR'
  | 'ADMIN_ACCESS_DENIED'
  | 'ADMIN_ACTION_PERFORMED'
  | 'DELEGATE_ACTIVATION_ATTEMPT'
  | 'DELEGATE_ACTIVATION_SUCCESS'
  | 'DELEGATE_ACTIVATION_FAILED'
  | 'COURSE_MUTATION'
  | 'SECURITY_VALIDATION_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXCEEDED'
  | 'PAYLOAD_TOO_LARGE'
  | 'ABUSIVE_REQUEST_BLOCKED';

export interface SecurityEventLog {
  timestamp: string;
  eventType: SecurityEventType;
  ip?: string;
  userIdentifier?: string; // Masked email / username
  resource?: string;
  details?: Record<string, unknown>;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
}

/**
 * Mask an email address to protect PII in logs (e.g. user@example.com -> u***r@example.com).
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'anonymous';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Mask a token or key to show only first and last characters.
 */
export function maskToken(token?: string): string {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Log a security event.
 */
export function logSecurityEvent(event: Omit<SecurityEventLog, 'timestamp'>): void {
  const payload: SecurityEventLog = {
    timestamp: new Date().toISOString(),
    ...event,
    userIdentifier: event.userIdentifier ? maskEmail(event.userIdentifier) : undefined,
  };

  // In production, write structured JSON to stdout for container log collectors
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({ ...payload, context: 'ujlog_security_audit' }));
  } else {
    const icon =
      payload.severity === 'CRITICAL' ? '🛑' :
      payload.severity === 'ERROR' ? '❌' :
      payload.severity === 'WARN' ? '⚠️' : '🛡️';
    console.log(`${icon} [SECURITY_${payload.severity}] ${payload.eventType} - ${payload.userIdentifier || 'unknown'} - IP: ${payload.ip || 'local'}`);
  }
}
