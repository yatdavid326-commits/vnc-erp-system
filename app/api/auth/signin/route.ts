import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/db/supabase';
import { createSignInResponse } from '@/lib/auth/sessionCookies';
import { validateSameOriginJsonRequest } from '@/lib/auth/validateSameOriginJsonRequest';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { signInSchema } from '@/lib/validation/requestSchemas';

export async function POST(request: NextRequest) {
  try {
    const invalidRequest = validateSameOriginJsonRequest(
      request,
      request.nextUrl.origin
    );
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
      return NextResponse.json(
        { error: error.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
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
