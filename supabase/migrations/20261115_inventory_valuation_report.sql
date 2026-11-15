create or replace function public.inventory_valuation_report()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with stock as (
    select
      p.cost_price,
      i.quantity_on_hand,
      i.quantity_reserved,
      case
        when i.quantity_on_hand is null then 'unregistered'
        when i.quantity_on_hand < 0 or i.quantity_reserved is null or i.quantity_reserved < 0
          or i.quantity_reserved > i.quantity_on_hand then 'invalid'
        when i.quantity_on_hand = 0 then 'zero'
        else 'positive'
      end as stock_status
    from public.products p
    left join public.inventory i on i.product_id = p.id
    where p.is_active is true
  )
  select jsonb_build_object(
    'total_products', count(*),
    'valued_products', count(*) filter (
      where stock_status in ('zero', 'positive') and cost_price >= 0
    ),
    'not_valued_products', count(*) filter (
      where stock_status in ('unregistered', 'invalid') or cost_price is null or cost_price < 0
    ),
    'invalid_cost_products', count(*) filter (
      where cost_price is null or cost_price < 0
    ),
    'inventory_cost_value_gtq', coalesce(
      sum(cost_price * quantity_on_hand) filter (
        where stock_status in ('zero', 'positive') and cost_price >= 0
      ),
      0
    )::text
  )
  from stock
$$;

revoke all on function public.inventory_valuation_report() from public, anon, authenticated;
grant execute on function public.inventory_valuation_report() to service_role;
