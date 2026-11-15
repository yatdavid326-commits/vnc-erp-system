begin;

create or replace function public.purchase_supplier_report(
  p_start date, p_end date, p_page integer, p_page_size integer
) returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if (p_start is null) <> (p_end is null) or p_start > p_end
    or p_page is null or p_page not between 1 and 10000
    or p_page_size is null or p_page_size not between 1 and 100 then
    raise exception 'invalid_report_parameters' using errcode = 'P0001';
  end if;

  with eligible_orders as (
    select po.supplier_id, s.name as supplier_name, po.total_amount,
      po.total_amount between 0 and 9999999999.99
        and po.total_amount = round(po.total_amount, 2) as amount_is_valid
    from public.purchase_orders po
    left join public.suppliers s on s.id = po.supplier_id
    where p_start is null or po.order_date between p_start and p_end
  ), supplier_totals as (
    select supplier_id,
      coalesce(max(supplier_name), 'Proveedor sin nombre registrado') as supplier_name,
      count(*) as total_orders,
      coalesce(sum(total_amount) filter (where amount_is_valid), 0) as amount_value,
      count(*) filter (where not coalesce(amount_is_valid, false)) as unvalued_amount_orders
    from eligible_orders
    group by supplier_id
  )
  select jsonb_build_object(
    'supplier_count', (select count(*) from supplier_totals),
    'page', p_page,
    'page_size', p_page_size,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'supplier_id', page.supplier_id,
        'supplier_name', page.supplier_name,
        'total_orders', page.total_orders,
        'total_amount_gtq', page.amount_value::text,
        'unvalued_amount_orders', page.unvalued_amount_orders
      ) order by page.amount_value desc, page.supplier_name, page.supplier_id nulls last)
      from (
        select * from supplier_totals
        order by amount_value desc, supplier_name, supplier_id nulls last
        limit p_page_size offset (p_page - 1) * p_page_size
      ) page
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

revoke all on function public.purchase_supplier_report(date, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.purchase_supplier_report(date, date, integer, integer)
  to service_role;

commit;
