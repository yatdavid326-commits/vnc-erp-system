import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Error loading audit logs:', error);
    return NextResponse.json(
      { error: 'No se pudo cargar la auditoría.' },
      { status: 500 }
    );
  }
}
