import { supabaseAdmin } from '@/lib/db/supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Execute the permission fix SQL using raw SQL execution
    // Note: Supabase RPC is limited, so we'll use a direct SQL approach
    
    const SQL = `
      -- Grant all permissions to authenticated users
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
      
      -- Grant all permissions to anon (public) users
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
      
      -- Grant all permissions to service_role
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
      
      -- Set default permissions for future tables
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, anon, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated, anon, service_role;
      
      -- Disable RLS on all tables
      ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS modules DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS user_modules DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS attendance DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS cash_movements DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS cash_register DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS employees DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS inventory DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS inventory_movements DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS pos_items DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS pos_transactions DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS purchases DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS suppliers DISABLE ROW LEVEL SECURITY;
    `;

    console.log('Attempting to fix permissions...');
    
    // We cannot directly execute DDL via Supabase REST API
    // This endpoint is informational - the actual fix needs to be done in SQL Editor
    return NextResponse.json({
      message: 'Permission fix must be executed directly in Supabase SQL Editor',
      instructions: 'Please run the fix_permissions.sql script in the Supabase SQL Editor',
      sql: SQL,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
