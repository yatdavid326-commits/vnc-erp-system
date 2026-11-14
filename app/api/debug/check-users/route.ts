import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    // Check all user_profiles
    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, username, full_name')
      .limit(20);

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError },
        { status: 500 }
      );
    }

    // Check Supabase Auth users
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json(
        { error: authError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Database diagnostics',
      user_profiles: allProfiles || [],
      auth_users: users?.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      })) || [],
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
