import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint disables Row Level Security on all tables
// It uses SQL commands via Supabase service role
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

    // Create a Supabase client with service role (has admin privileges)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // List of all tables to disable RLS
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

    const results = [];
    let successCount = 0;

    // Disable RLS on each table using raw query via Supabase PostgreSQL
    for (const table of tables) {
      try {
        // Use SQL directly by updating a dummy row to trigger the query
        // Actually, we need to use the PostgreSQL endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({
            query: `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`,
          }),
        });

        if (response.ok) {
          results.push({
            table,
            status: 'success',
            message: `RLS disabled for ${table}`,
          });
          successCount++;
        } else {
          const error = await response.json();
          results.push({
            table,
            status: 'error',
            message: error.message || 'Unknown error',
          });
        }
      } catch (err: any) {
        results.push({
          table,
          status: 'error',
          message: err.message,
        });
      }
    }

    return NextResponse.json({
      success: successCount === tables.length,
      message: `Completed processing ${successCount}/${tables.length} tables`,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
