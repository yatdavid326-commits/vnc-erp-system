import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'supabaseAdmin is null - SUPABASE_SERVICE_ROLE_KEY not configured' },
        { status: 500 }
      );
    }

    // Try to query user_profiles
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('username, email, full_name')
      .limit(5);

    return NextResponse.json({
      success: true,
      data,
      error,
      supabaseAdminAvailable: !!supabaseAdmin,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
