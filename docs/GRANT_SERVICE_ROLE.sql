-- GRANT Permissions to service_role for Supabase
-- Copy and paste this into Supabase SQL Editor and click "Run"

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_register TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO service_role;