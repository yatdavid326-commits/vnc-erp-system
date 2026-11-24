import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookies';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.startsWith('Bearer ')
    ? request.headers.get('authorization')!.slice(7)
    : request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!url || !key || !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  await client.auth.setSession({
    access_token: token,
    refresh_token: request.cookies.get('sb-refresh-token')?.value ?? '',
  });
  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Autenticador ERP',
  });
  if (error) {
    return NextResponse.json({ error: 'No se pudo iniciar la configuración MFA.' }, { status: 500 });
  }
  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  });
}
