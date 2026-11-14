-- ============================================================================
-- VNC Systems ERP - Disable Row Level Security (RLS) on all tables
-- ============================================================================
-- Instrucciones: Copiar todo este contenido, ir a Supabase SQL Editor,
-- crear una nueva query y pegar. Luego ejecutar.
-- ============================================================================

-- Deshabilitar RLS en todas las tablas
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'user_profiles', 'modules', 'user_modules', 'attendance', 'audit_logs',
  'cash_movements', 'cash_register', 'categories', 'customers', 'employees',
  'inventory', 'inventory_movements', 'pos_items', 'pos_transactions',
  'purchase_items', 'purchases', 'suppliers'
)
ORDER BY tablename;
