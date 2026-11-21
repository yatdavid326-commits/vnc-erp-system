import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/db/supabase';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/constants';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (
      typeof username !== 'string' ||
      !username.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

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

    // Keep the access token in an HttpOnly cookie for authenticated API requests.
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    });

    if (data.session) {
      response.cookies.set(ACCESS_TOKEN_COOKIE, data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: data.session.expires_in,
      });
    }

    return response;
  } catch (error) {
    console.error('Error in signin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
