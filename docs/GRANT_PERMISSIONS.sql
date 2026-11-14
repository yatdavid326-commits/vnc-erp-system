-- Grant SELECT to service_role on user_profiles (for login)
GRANT SELECT ON public.user_profiles TO service_role;
GRANT SELECT ON public.modules TO service_role;
GRANT SELECT ON public.user_modules TO service_role;
GRANT SELECT ON public.employees TO service_role;
GRANT SELECT ON public.categories TO service_role;
GRANT SELECT ON public.products TO service_role;
GRANT SELECT ON public.customers TO service_role;
GRANT SELECT ON public.suppliers TO service_role;
GRANT SELECT ON public.purchase_orders TO service_role;
GRANT SELECT ON public.purchase_order_items TO service_role;
GRANT SELECT ON public.sales TO service_role;
GRANT SELECT ON public.sale_items TO service_role;
GRANT SELECT ON public.cash_register TO service_role;
GRANT SELECT ON public.cash_movements TO service_role;
GRANT SELECT ON public.attendance TO service_role;
GRANT SELECT ON public.audit_logs TO service_role;
GRANT SELECT ON public.inventory_movements TO service_role;

-- Also grant other permissions needed
GRANT UPDATE, INSERT, DELETE ON public.user_profiles TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.modules TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.user_modules TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.employees TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.categories TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.products TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.customers TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.suppliers TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.purchase_orders TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.purchase_order_items TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.sales TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.sale_items TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.cash_register TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.cash_movements TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.attendance TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.audit_logs TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.inventory_movements TO service_role;
