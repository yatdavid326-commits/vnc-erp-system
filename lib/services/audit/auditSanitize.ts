const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'access_token',
  'refresh_token',
  'service_role_key',
  'api_key',
  'secret',
]);

export function sanitizeAuditValues(
  values: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!values) return null;
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) =>
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? [key, '[REDACTED]']
        : [key, value]
    )
  );
}
