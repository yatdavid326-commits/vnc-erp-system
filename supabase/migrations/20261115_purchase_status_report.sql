begin;

create function public.purchase_status_report(p_start date, p_end date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if (p_start is null) <> (p_end is null) or p_start > p_end then
    raise exception 'invalid_report_dates' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'partially_received', count(*) filter (where status = 'partially_received'),
    'received', count(*) filter (where status = 'received'),
    'cancelled', count(*) filter (where status = 'cancelled'),
    'other', count(*) filter (where status is null or status not in ('pending', 'partially_received', 'received', 'cancelled'))
  ) into result
  from public.purchase_orders
  where p_start is null or order_date between p_start and p_end;
  return result;
end
$$;

revoke all on function public.purchase_status_report(date, date) from public, anon, authenticated;
grant execute on function public.purchase_status_report(date, date) to service_role;

commit;
