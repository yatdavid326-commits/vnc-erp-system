create or replace function public.inventory_detail_report_page(
  p_after_id uuid default null,
  p_limit integer default 500
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with page as (
    select
      p.id,
      p.product_code,
      p.name,
      p.unit_of_measure,
      p.cost_price::text as cost_price,
      p.selling_price::text as selling_price,
      p.reorder_level,
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
      and (p_after_id is null or p.id > p_after_id)
    order by p.id
    limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  )
  select coalesce(jsonb_agg(to_jsonb(page) order by id), '[]'::jsonb)
  from page
$$;

revoke all on function public.inventory_detail_report_page(uuid, integer) from public, anon, authenticated;
grant execute on function public.inventory_detail_report_page(uuid, integer) to service_role;
