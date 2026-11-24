import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  ACCESS_TOKEN_COOKIE,
  clearPendingMfaCookie,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from '@/lib/auth/sessionCookies';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { mfaVerifySchema } from '@/lib/validation/requestSchemas';

export async function POST(request: NextRequest) {
  const parsed = await validateRequestBody(request, mfaVerifySchema);
  if (!parsed.success) return parsed.response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = request.headers.get('authorization')?.startsWith('Bearer ')
    ? request.headers.get('authorization')!.slice(7)
    : request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!url || !key || !accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const session = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (session.error) return clearAuthCookies(NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }));

  const challenge = await client.auth.mfa.challenge({ factorId: parsed.data.factorId });
  if (challenge.error) {
    return NextResponse.json({ error: 'No se pudo crear el desafío MFA.' }, { status: 400 });
  }
  const verified = await client.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.data.id,
    code: parsed.data.code,
  });
  if (verified.error) {
    return NextResponse.json({ error: 'Código MFA inválido.' }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  setAuthCookies(response, {
    access_token: verified.data.access_token,
    refresh_token: verified.data.refresh_token,
    expires_in: verified.data.expires_in,
  });
  clearPendingMfaCookie(response);
  return response;
}
