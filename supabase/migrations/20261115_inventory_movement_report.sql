begin;

create index if not exists inventory_movements_created_at_id_idx
  on public.inventory_movements (created_at desc, id desc);

create or replace function public.inventory_movement_report(
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

  with eligible_movements as (
    select m.id, m.product_id,
      coalesce(nullif(btrim(p.name), ''), 'Producto sin nombre registrado') as product_name,
      m.movement_type, m.quantity, m.reference_type, m.reference_id, m.notes,
      m.created_by, nullif(btrim(u.full_name), '') as actor_name, m.created_at
    from public.inventory_movements m
    left join public.products p on p.id = m.product_id
    left join public.user_profiles u on u.id = m.created_by
    where (p_start is null or m.created_at >= (p_start::timestamp at time zone 'America/Guatemala'))
      and (p_end is null or m.created_at < ((p_end + 1)::timestamp at time zone 'America/Guatemala'))
  )
  select jsonb_build_object(
    'total_count', (select count(*) from eligible_movements),
    'page', p_page,
    'page_size', p_page_size,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'product_id', page.product_id,
        'product_name', page.product_name,
        'movement_type', page.movement_type,
        'quantity', page.quantity,
        'reference_type', page.reference_type,
        'reference_id', page.reference_id,
        'notes', page.notes,
        'created_by', page.created_by,
        'actor_name', page.actor_name,
        'created_at', page.created_at
      ) order by page.created_at desc nulls last, page.id desc)
      from (
        select * from eligible_movements
        order by created_at desc nulls last, id desc
        limit p_page_size offset (p_page - 1) * p_page_size
      ) page
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

revoke all on function public.inventory_movement_report(date, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.inventory_movement_report(date, date, integer, integer)
  to service_role;

commit;
