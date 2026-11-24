begin;

create index if not exists idx_attendance_employee_fecha
  on public.asistencia (empleado_id, fecha desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_user_created_at
  on public.audit_logs (user_id, created_at desc);

create index if not exists idx_notifications_recipient_read_created
  on public.notifications (recipient_auth_id, read_at, created_at desc);

create index if not exists idx_cash_register_cashier_status
  on public.cash_register (cashier_id, status);
create index if not exists idx_cash_movements_register_date
  on public.cash_movements (cash_register_id, movement_date desc);
create index if not exists idx_cash_movements_created_at
  on public.cash_movements (created_at desc);

create index if not exists idx_inventory_movements_product_created
  on public.inventory_movements (product_id, created_at desc);
create index if not exists idx_inventory_product_quantity
  on public.inventory (product_id, quantity_on_hand);

create index if not exists idx_purchase_orders_status_date
  on public.purchase_orders (status, order_date desc);
create index if not exists idx_purchase_orders_supplier_date
  on public.purchase_orders (supplier_id, order_date desc);
create index if not exists idx_purchase_order_items_order
  on public.purchase_order_items (purchase_order_id);

create index if not exists idx_customers_status_type
  on public.customers (status, customer_type);
create index if not exists idx_products_active_category
  on public.products (is_active, category_id);

commit;
