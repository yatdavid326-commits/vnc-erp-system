import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/db/supabase';
import { createSignInResponse, setPendingMfaCookies } from '@/lib/auth/sessionCookies';
import { parseSignInLimit, signInClientKey, upstreamSignInErrorResponse } from '@/lib/auth/signInRateLimit';
import { validateSameOriginJsonRequest } from '@/lib/auth/validateSameOriginJsonRequest';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { signInSchema } from '@/lib/validation/requestSchemas';

export async function POST(request: NextRequest) {
  try {
    const invalidRequest = validateSameOriginJsonRequest(request);
    if (invalidRequest) return invalidRequest;

    const parsedBody = await validateRequestBody(request, signInSchema);
    if (!parsedBody.success) return parsedBody.response;
    const { username, password } = parsedBody.data;

    // Step 1: Find the email by username using admin client (bypasses RLS)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase authentication is not configured.');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const clientKey = signInClientKey(
      request.headers,
      process.env.VERCEL === '1',
      process.env.NODE_ENV === 'production',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    if (!clientKey) {
      console.error('Sign-in rate limiter cannot identify the client.');
      return NextResponse.json({ error: 'Inicio de sesión no disponible. Intenta más tarde.' }, { status: 503 });
    }

    const { data: limitData, error: limitError } = await supabaseAdmin.rpc(
      'consume_signin_attempt',
      { p_client_key: clientKey }
    );
    const limit = parseSignInLimit(limitData);
    if (limitError || !limit) {
      console.error('Sign-in rate limiter failed:', limitError);
      return NextResponse.json({ error: 'Inicio de sesión no disponible. Intenta más tarde.' }, { status: 503 });
    }
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente más tarde.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    let email = username.trim();
    if (!email.includes('@')) {
      const { data: profiles, error: lookupError } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('username', email);

      if (lookupError || !profiles || profiles.length === 0) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      email = profiles[0].email;
    }

    // Keep password sign-in from mutating the shared admin client's session.
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return upstreamSignInErrorResponse(error);
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const { data: factorsData } = await authClient.auth.mfa.listFactors();
    const verifiedFactors = (factorsData?.totp ?? []).filter(
      (factor) => factor.status === 'verified'
    );
    if (verifiedFactors.length > 0) {
      const response = NextResponse.json({
        authenticated: false,
        mfaRequired: true,
      });
      return setPendingMfaCookies(response, data.session);
    }

    return createSignInResponse(data.session);
  } catch (error) {
    console.error('Error in signin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
