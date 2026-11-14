import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin not available' }, { status: 500 });
    }

    // Test proveedores table
    const { data, error } = await supabaseAdmin
      .from('proveedores')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: !error,
      data,
      error,
      message: error ? 'Error querying proveedores table' : 'Success'
    });
  } catch (ex) {
    return NextResponse.json(
      { error: String(ex), success: false },
      { status: 500 }
    );
  }
}
