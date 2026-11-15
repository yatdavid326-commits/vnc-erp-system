begin;

create index if not exists purchase_orders_order_date_id_idx
  on public.purchase_orders (order_date, id);

create index if not exists purchase_order_items_order_product_idx
  on public.purchase_order_items (purchase_order_id, product_id);

create or replace function public.purchase_product_report(
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

  with eligible_lines as (
    select i.product_id,
      coalesce(nullif(btrim(p.name), ''), 'Producto sin nombre registrado') as product_name,
      coalesce(nullif(btrim(p.product_code), ''), 'Sin código') as product_code,
      o.id as order_id,
      i.quantity_ordered,
      i.quantity_received,
      i.unit_price,
      i.line_total,
      i.quantity_ordered > 0 as quantity_is_valid,
      i.quantity_ordered > 0 and i.quantity_received between 0 and i.quantity_ordered as received_quantity_is_valid,
      i.quantity_ordered > 0
        and i.unit_price between 0 and 9999999999.99
        and i.unit_price = round(i.unit_price, 2)
        and i.line_total between 0 and 9999999999.99
        and i.line_total = round(i.line_total, 2)
        and i.line_total = i.quantity_ordered::numeric * i.unit_price as amount_is_valid
    from public.purchase_order_items i
    join public.purchase_orders o on o.id = i.purchase_order_id
    left join public.products p on p.id = i.product_id
    where p_start is null or o.order_date between p_start and p_end
  ), product_totals as (
    select product_id,
      coalesce(max(product_name), 'Producto sin nombre registrado') as product_name,
      coalesce(max(product_code), 'Sin código') as product_code,
      count(distinct order_id) as order_count,
      count(*) as line_count,
      coalesce(sum(quantity_ordered) filter (where quantity_is_valid), 0) as quantity_ordered,
      coalesce(sum(quantity_received) filter (where received_quantity_is_valid), 0) as quantity_received,
      coalesce(sum(line_total) filter (where amount_is_valid), 0) as ordered_amount,
      count(*) filter (where not coalesce(quantity_is_valid and received_quantity_is_valid, false)) as invalid_quantity_lines,
      count(*) filter (where not coalesce(amount_is_valid, false)) as untrusted_amount_lines
    from eligible_lines
    group by product_id
  )
  select jsonb_build_object(
    'product_count', (select count(*) from product_totals),
    'page', p_page,
    'page_size', p_page_size,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', page.product_id,
        'product_name', page.product_name,
        'product_code', page.product_code,
        'order_count', page.order_count,
        'line_count', page.line_count,
        'quantity_ordered', page.quantity_ordered,
        'quantity_received', page.quantity_received,
        'ordered_amount_gtq', page.ordered_amount::text,
        'invalid_quantity_lines', page.invalid_quantity_lines,
        'untrusted_amount_lines', page.untrusted_amount_lines
      ) order by page.ordered_amount desc, page.order_count desc, page.product_name, page.product_id)
      from (
        select * from product_totals
        order by ordered_amount desc, order_count desc, product_name, product_id
        limit p_page_size offset (p_page - 1) * p_page_size
      ) page
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

revoke all on function public.purchase_product_report(date, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.purchase_product_report(date, date, integer, integer)
  to service_role;

commit;
