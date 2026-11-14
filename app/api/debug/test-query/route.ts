import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'supabaseAdmin is null' },
        { status: 500 }
      );
    }

    // Test .eq() query
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('email, username, full_name')
      .eq('username', 'admin');

    return NextResponse.json({
      query: 'eq(username, admin)',
      data,
      error,
      success: !error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
