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

    // Get all modules using the admin client (bypasses RLS)
    const { data: modules, error } = await supabaseAdmin
      .from('modules')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching modules:', error);
      return NextResponse.json({ error: 'Error fetching modules' }, { status: 500 });
    }

    return NextResponse.json(modules);
  } catch (error) {
    console.error('Error in /api/modules/all:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
