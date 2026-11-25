import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSameOriginJsonRequest } from '@/lib/auth/validateSameOriginJsonRequest';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { passwordRecoveryRequestSchema } from '@/lib/validation/requestSchemas';

export async function POST(request: NextRequest) {
  const invalidRequest = validateSameOriginJsonRequest(request);
  if (invalidRequest) return invalidRequest;

  const parsed = await validateRequestBody(request, passwordRecoveryRequestSchema);
  if (!parsed.success) return parsed.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const protocol =
    request.headers.get('x-forwarded-proto') ??
    new URL(request.url).protocol.slice(0, -1);
  const host = request.headers.get('host');
  if (!host) {
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  let redirectOrigin: string;
  try {
    redirectOrigin = new URL(`${protocol}://${host}`).origin;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  await client.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${redirectOrigin}/reset-password`,
  });

  return NextResponse.json({
    sent: true,
    message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
  });
}
