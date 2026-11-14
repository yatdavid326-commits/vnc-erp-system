import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role key for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    console.log(`[login-lookup] Looking for username: ${username}`);
    console.log(`[login-lookup] supabaseAdmin available: ${!!supabaseAdmin}`);

    // Use admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('email, username')
      .eq('username', username);

    console.log(`[login-lookup] Query result:`, { data, error });

    if (error) {
      console.error('[login-lookup] Supabase error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log(`[login-lookup] No user found with username: ${username}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const profile = data[0];
    console.log(`[login-lookup] Found user:`, { email: profile.email, username: profile.username });

    return NextResponse.json({
      email: profile.email,
      username: profile.username,
    });
  } catch (error) {
    console.error('[login-lookup] Error in login lookup:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
