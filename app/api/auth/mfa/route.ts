import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ACCESS_TOKEN_COOKIE, MFA_PENDING_COOKIE } from '@/lib/auth/sessionCookies';

function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function accessToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function GET(request: NextRequest) {
  const token = accessToken(request);
  const client = authClient();
  if (!token || !client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await client.auth.setSession({ access_token: token, refresh_token: request.cookies.get('sb-refresh-token')?.value ?? '' });
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) {
    return NextResponse.json({ error: 'No se pudo consultar MFA.' }, { status: 500 });
  }
  const factors = (data?.totp ?? []).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name,
    status: factor.status,
  }));
  return NextResponse.json({ factors, pending: request.cookies.get(MFA_PENDING_COOKIE)?.value === '1' });
}
