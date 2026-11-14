-- Crear función que deshabilita RLS en todas las tablas
-- Esta función debe ejecutarse una sola vez desde el SQL editor de Supabase

-- DROP FUNCTION IF EXISTS public.disable_all_rls();

CREATE OR REPLACE FUNCTION public.disable_all_rls()
RETURNS TABLE(table_name text, status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_rec RECORD;
  sql_cmd text;
BEGIN
  -- Deshabilitar RLS en user_profiles
  ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('user_profiles', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en modules
  ALTER TABLE IF EXISTS public.modules DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('modules', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en user_modules
  ALTER TABLE IF EXISTS public.user_modules DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('user_modules', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en attendance
  ALTER TABLE IF EXISTS public.attendance DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('attendance', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en audit_logs
  ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('audit_logs', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en cash_movements
  ALTER TABLE IF EXISTS public.cash_movements DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('cash_movements', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en cash_register
  ALTER TABLE IF EXISTS public.cash_register DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('cash_register', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en categories
  ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('categories', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en customers
  ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('customers', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en employees
  ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('employees', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en inventory
  ALTER TABLE IF EXISTS public.inventory DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('inventory', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en inventory_movements
  ALTER TABLE IF EXISTS public.inventory_movements DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('inventory_movements', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en pos_items
  ALTER TABLE IF EXISTS public.pos_items DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('pos_items', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en pos_transactions
  ALTER TABLE IF EXISTS public.pos_transactions DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('pos_transactions', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en purchase_items
  ALTER TABLE IF EXISTS public.purchase_items DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('purchase_items', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en purchases
  ALTER TABLE IF EXISTS public.purchases DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('purchases', 'success', 'RLS disabled');
  
  -- Deshabilitar RLS en suppliers
  ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
  INSERT INTO table (table_name, status, message) VALUES ('suppliers', 'success', 'RLS disabled');

  RETURN QUERY SELECT 'all_tables'::text, 'complete'::text, 'All RLS policies disabled'::text;
END;
$$;
