import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { NextResponse } from 'next/server.js';

export function upstreamSignInErrorResponse(error: { status?: number; message: string }): NextResponse {
  if (error.status === 429) {
    return NextResponse.json(
      { error: 'El servicio de autenticación está temporalmente limitado. Intenta nuevamente más tarde.' },
      { status: 429 }
    );
  }
  return NextResponse.json(
    { error: error.message || 'Authentication failed' },
    { status: 401 }
  );
}

export function signInClientKey(
  headers: Headers,
  isVercel: boolean,
  isProduction: boolean,
  secret: string | undefined
): string | null {
  if (!secret) return null;

  let client = 'local-development';
  if (isVercel) {
    const ip = headers.get('x-vercel-forwarded-for')?.trim();
    const version = ip ? isIP(ip) : 0;
    if (!ip || !version) return null;
    client = version === 6 ? new URL(`http://[${ip}]`).hostname : ip;
  } else if (isProduction) {
    return null;
  }

  return createHmac('sha256', secret).update(client).digest('hex');
}

export function parseSignInLimit(value: unknown): { allowed: boolean; retryAfter: number } | null {
  if (typeof value !== 'object' || value === null || !('allowed' in value) || !('retry_after' in value)) {
    return null;
  }
  if (typeof value.allowed !== 'boolean' || typeof value.retry_after !== 'number'
    || !Number.isInteger(value.retry_after)
    || (value.allowed ? value.retry_after !== 0 : value.retry_after < 1 || value.retry_after > 900)) {
    return null;
  }
  return { allowed: value.allowed, retryAfter: value.retry_after };
}
