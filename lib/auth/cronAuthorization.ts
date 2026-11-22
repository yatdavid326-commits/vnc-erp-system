import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

export function hasValidCronAuthorization(
  authorizationHeader: string | null,
  secret: string
) {
  const prefix = 'Bearer ';
  if (!secret || !authorizationHeader?.startsWith(prefix)) return false;

  const supplied = Buffer.from(authorizationHeader.slice(prefix.length));
  const expected = Buffer.from(secret);
  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}
