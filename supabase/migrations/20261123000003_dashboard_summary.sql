begin;

create or replace function public.get_dashboard_summary()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with current_month_sales as (
    select
      count(*) as sale_count,
      coalesce(sum(sale.monto_total), 0) as sale_amount
    from public.pos_transacciones as sale
    where sale.estado = 'completada'
      and sale.created_at >= date_trunc('month', now())
      and sale.created_at < date_trunc('month', now()) + interval '1 month'
  ),
  stock_summary as (
    select
      count(*) filter (where product_stock.available_quantity > 0)
        as products_with_stock,
      coalesce(sum(product_stock.available_quantity), 0) as available_units
    from (
      select greatest(
        coalesce(inventory.quantity_on_hand, 0)
          - coalesce(inventory.quantity_reserved, 0),
        0
      ) as available_quantity
      from public.products as product
      left join public.inventory as inventory
        on inventory.product_id = product.id
      where product.is_active is true
    ) as product_stock
  ),
  active_customer_summary as (
    select count(*) as active_customer_count
    from public.customers
    where is_active is true
  ),
  income_summary as (
    select coalesce(sum(sale.monto_total), 0) as total_income
    from public.pos_transacciones as sale
    where sale.estado = 'completada'
  ),
  recent_sales as (
    select
      sale.id,
      coalesce(sale.numero_transaccion, sale.id::text) as transaction_number,
      coalesce(sale.metodo_pago, 'desconocido') as payment_method,
      coalesce(sale.monto_total, 0) as total,
      sale.created_at
    from public.pos_transacciones as sale
    where sale.estado = 'completada'
    order by sale.created_at desc, sale.id desc
    limit 5
  ),
  low_stock as (
    select
      product.id,
      product.product_code,
      product.name,
      coalesce(inventory.quantity_on_hand, 0) as quantity_on_hand,
      greatest(coalesce(product.reorder_level, 0), 0) as reorder_level
    from public.products as product
    left join public.inventory as inventory
      on inventory.product_id = product.id
    where product.is_active is true
      and coalesce(inventory.quantity_on_hand, 0)
        <= greatest(coalesce(product.reorder_level, 0), 0)
  ),
  low_stock_summary as (
    select count(*) as low_stock_count
    from low_stock
  ),
  low_stock_products as (
    select *
    from low_stock
    order by quantity_on_hand asc, name asc, id asc
    limit 5
  )
  select jsonb_build_object(
    'salesThisMonth', jsonb_build_object(
      'amount', current_month_sales.sale_amount,
      'count', current_month_sales.sale_count
    ),
    'stock', jsonb_build_object(
      'productsWithStock', stock_summary.products_with_stock,
      'availableUnits', stock_summary.available_units
    ),
    'activeCustomers', active_customer_summary.active_customer_count,
    'totalIncome', income_summary.total_income,
    'recentSales', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', recent_sales.id,
            'transactionNumber', recent_sales.transaction_number,
            'paymentMethod', recent_sales.payment_method,
            'total', recent_sales.total,
            'createdAt', recent_sales.created_at
          )
          order by recent_sales.created_at desc, recent_sales.id desc
        )
        from recent_sales
      ),
      '[]'::jsonb
    ),
    'lowStockCount', low_stock_summary.low_stock_count,
    'lowStockProducts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', low_stock_products.id,
            'productCode', low_stock_products.product_code,
            'name', low_stock_products.name,
            'quantityOnHand', low_stock_products.quantity_on_hand,
            'reorderLevel', low_stock_products.reorder_level
          )
          order by low_stock_products.quantity_on_hand asc,
            low_stock_products.name asc,
            low_stock_products.id asc
        )
        from low_stock_products
      ),
      '[]'::jsonb
    )
  )
  from current_month_sales
  cross join stock_summary
  cross join active_customer_summary
  cross join income_summary
  cross join low_stock_summary;
$$;

revoke all on function public.get_dashboard_summary()
  from public, anon, authenticated;
grant execute on function public.get_dashboard_summary() to service_role;

commit;
