import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSameOriginJsonRequest } from '@/lib/auth/validateSameOriginJsonRequest';
import { setAuthCookies } from '@/lib/auth/sessionCookies';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { passwordRecoveryResetSchema } from '@/lib/validation/requestSchemas';

export async function POST(request: NextRequest) {
  const invalidRequest = validateSameOriginJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const parsed = await validateRequestBody(request, passwordRecoveryResetSchema);
  if (!parsed.success) return parsed.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const recoverySession = parsed.data.code
    ? await client.auth.exchangeCodeForSession(parsed.data.code)
    : await client.auth.verifyOtp({
        token_hash: parsed.data.token_hash!,
        type: 'recovery',
      });
  if (recoverySession.error || !recoverySession.data.session) {
    return NextResponse.json(
      { error: 'El enlace de recuperación es inválido o ha expirado.' },
      { status: 400 }
    );
  }

  const updated = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (updated.error) {
    return NextResponse.json(
      { error: 'No se pudo actualizar la contraseña.' },
      { status: 400 }
    );
  }

  const session = recoverySession.data.session;
  const response = NextResponse.json({
    authenticated: true,
    message: 'Contraseña actualizada.',
  });
  return setAuthCookies(response, session);
}
