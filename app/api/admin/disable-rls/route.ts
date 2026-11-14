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

    // Execute SQL to disable RLS on user_profiles
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;'
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Row Level Security disabled on user_profiles',
      data
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
