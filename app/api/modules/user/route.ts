import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get the user from the Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify the token and get the user ID
    const {
      data: { user },
      error: tokenError,
    } = await supabaseAdmin.auth.getUser(token);

    if (tokenError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user modules with details using the admin client (bypasses RLS)
    const { data: userModules, error } = await supabaseAdmin
      .from('user_modules')
      .select(
        `
        *,
        module:modules (*)
      `
      )
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user modules:', error);
      return NextResponse.json(
        { error: 'User modules not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(userModules);
  } catch (error) {
    console.error('Error in /api/modules/user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
