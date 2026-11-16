-- PENDIENTE (no aplicada): alternativa SQL al cálculo de
-- app/api/inventario/bajo-stock/productos/route.ts. Aplicar solo si el catálogo crece
-- lo suficiente para que el cálculo en el servidor sea lento, y cambiar la ruta a .rpc().

begin;

create or replace function public.low_stock_products_report(
  p_page integer, p_page_size integer
) returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if p_page is null or p_page not between 1 and 10000
    or p_page_size is null or p_page_size not between 1 and 100 then
    raise exception 'invalid_report_parameters' using errcode = 'P0001';
  end if;

  with active_stock as materialized (
    select p.id, p.product_code, p.name, p.reorder_level, i.quantity_on_hand
    from public.products p
    left join public.inventory i on i.product_id = p.id
    where p.is_active is true
  ), low_stock as materialized (
    select * from active_stock
    where quantity_on_hand >= 0 and reorder_level >= 0 and quantity_on_hand <= reorder_level
  )
  select jsonb_build_object(
    'total', (select count(*) from low_stock),
    'not_evaluated', (select count(*) from active_stock
      where quantity_on_hand is null or quantity_on_hand < 0
         or reorder_level is null or reorder_level < 0),
    'page', p_page,
    'page_size', p_page_size,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'product_code', page.product_code,
        'name', page.name,
        'quantity_on_hand', page.quantity_on_hand,
        'reorder_level', page.reorder_level
      ) order by page.quantity_on_hand, page.product_code, page.id)
      from (
        select * from low_stock
        order by quantity_on_hand, product_code, id
        limit p_page_size offset (p_page - 1) * p_page_size
      ) page
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

revoke all on function public.low_stock_products_report(integer, integer)
  from public, anon, authenticated;
grant execute on function public.low_stock_products_report(integer, integer)
  to service_role;

commit;
