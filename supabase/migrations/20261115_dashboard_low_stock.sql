begin;

create function public.dashboard_low_stock()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with stock as materialized (
    select p.id, p.product_code, p.name, p.reorder_level, i.quantity_on_hand
    from public.products p
    left join public.inventory i on i.product_id = p.id
    where p.is_active is true
  ), low_stock as materialized (
    select * from stock
    where quantity_on_hand >= 0 and reorder_level >= 0 and quantity_on_hand <= reorder_level
  ), first_five as (
    select * from low_stock
    order by quantity_on_hand, product_code, id
    limit 5
  )
  select jsonb_build_object(
    'total', (select count(*) from low_stock),
    'not_evaluated', (select count(*) from stock
      where quantity_on_hand is null or quantity_on_hand < 0
         or reorder_level is null or reorder_level < 0),
    'items', coalesce(
      (select jsonb_agg(to_jsonb(first_five) order by quantity_on_hand, product_code, id) from first_five),
      '[]'::jsonb
    )
  )
$$;

revoke all on function public.dashboard_low_stock() from public, anon, authenticated;
grant execute on function public.dashboard_low_stock() to service_role;

commit;
