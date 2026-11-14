import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { supabase } from '@/lib/db/supabase';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
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

    const { data: profiles, error: lookupError } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('username', username);

    if (lookupError || !profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const email = profiles[0].email;

    // Step 2: Sign in with email and password using the regular client
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Create response with session data and tokens
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    });

    // Set auth cookies for server-side access
    if (data.session) {
      response.cookies.set('sb-session', JSON.stringify(data.session), {
        httpOnly: false, // Allow client to read for localStorage
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Also set individual token cookies
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
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
