import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/sessionCookies';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { z } from 'zod';

const unlinkSchema = z.object({ factorId: z.string().uuid() }).strict();

export async function POST(request: NextRequest) {
  const parsed = await validateRequestBody(request, unlinkSchema);
  if (!parsed.success) return parsed.response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!url || !key || !accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  const { error } = await client.auth.mfa.unenroll({ factorId: parsed.data.factorId });
  if (error) return NextResponse.json({ error: 'No se pudo eliminar el factor.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
