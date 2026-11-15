begin;

create function public.inventory_status_report()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with stock as (
    select case
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
    'total', count(*),
    'positive', count(*) filter (where stock_status = 'positive'),
    'zero', count(*) filter (where stock_status = 'zero'),
    'unregistered', count(*) filter (where stock_status = 'unregistered'),
    'invalid', count(*) filter (where stock_status = 'invalid')
  )
  from stock
$$;

revoke all on function public.inventory_status_report() from public, anon, authenticated;
grant execute on function public.inventory_status_report() to service_role;

commit;
