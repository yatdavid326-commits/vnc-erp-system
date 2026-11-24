-- Run inside a transaction and roll back index creation.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'idx_attendance_employee_fecha',
      'idx_audit_logs_created_at',
      'idx_audit_logs_user_created_at',
      'idx_notifications_recipient_read_created',
      'idx_cash_register_cashier_status',
      'idx_cash_movements_register_date',
      'idx_cash_movements_created_at',
      'idx_inventory_movements_product_created',
      'idx_inventory_product_quantity',
      'idx_purchase_orders_status_date',
      'idx_purchase_orders_supplier_date',
      'idx_purchase_order_items_order',
      'idx_customers_status_type',
      'idx_products_active_category'
    );
  if v_count < 14 then
    raise exception 'Operational index set incomplete: %', v_count;
  end if;
end
$$;
