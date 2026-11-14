import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Crear cliente con service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: any[] = [];

    // Lista de tablas a procesar
    const tables = [
      'user_profiles',
      'modules',
      'user_modules',
      'attendance',
      'audit_logs',
      'cash_movements',
      'cash_register',
      'categories',
      'customers',
      'employees',
      'inventory',
      'inventory_movements',
      'pos_items',
      'pos_transactions',
      'purchase_items',
      'purchases',
      'suppliers',
    ];

    // Intentar obtener información de RLS de cada tabla
    for (const table of tables) {
      try {
        // Intentar hacer un INSERT para verificar permisos de RLS
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(0);

        results.push({
          table,
          status: error ? 'RLS_BLOCKED' : 'ACCESSIBLE',
          error: error?.message || 'Table accessible',
        });
      } catch (err: any) {
        results.push({
          table,
          status: 'ERROR',
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      message: 'RLS Status Check - RLS is likely still enabled if you see RLS_BLOCKED errors',
      note: 'To disable RLS, you must execute the ALTER TABLE commands manually in Supabase SQL Editor',
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
