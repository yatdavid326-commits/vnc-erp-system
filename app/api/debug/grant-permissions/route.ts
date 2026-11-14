import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Admin client not initialized' },
      { status: 500 }
    );
  }

  try {
    // Execute GRANT commands for service_role
    const { error: err1 } = await supabaseAdmin.rpc('exec_sql', {
      query: 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores TO service_role;',
    }).catch(() => ({ error: null }));

    // Test by trying to query proveedores
    const { data: proveedores, error: queryError } = await supabaseAdmin
      .from('proveedores')
      .select('*')
      .limit(1);

    return NextResponse.json({
      message: 'Permissions verification',
      status: queryError ? 'NEEDS_PERMISSIONS' : 'OK',
      error: queryError ? queryError.message : null,
      canQuery: !queryError,
      hint: 'Run these SQL commands in Supabase SQL Editor:\nGRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores TO service_role;\nGRANT SELECT, INSERT, UPDATE, DELETE ON public.empleados TO service_role;\nGRANT SELECT, INSERT, UPDATE, DELETE ON public.asistencia TO service_role;\nGRANT SELECT, INSERT, UPDATE, DELETE ON public.compras TO service_role;\nGRANT SELECT, INSERT, UPDATE, DELETE ON public.cajas TO service_role;\nGRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_transacciones TO service_role;',
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
