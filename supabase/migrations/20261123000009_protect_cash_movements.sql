begin;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cash_movements')
    or exists (
      select 1 from pg_attribute
      where attrelid = 'public.cash_movements'::regclass
        and attnum > 0 and not attisdropped and attacl is not null
    ) then
    raise exception 'Review existing cash movement policies and column grants';
  end if;
end
$$;

alter table public.cash_movements enable row level security;
revoke all on table public.cash_movements from public, anon, authenticated;

create function public.mutate_manual_cash_movement(p_id uuid, p_actor uuid, p_changes jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_register uuid;
  v_result public.cash_movements;
begin
  if p_id is null or p_actor is null or (
    p_changes is not null and (
      jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb
      or p_changes - array['movement_type', 'amount', 'description'] <> '{}'::jsonb
    )
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_CASH_MOVEMENT';
  end if;
  if p_changes is not null and (
    (p_changes ? 'movement_type' and (
      jsonb_typeof(p_changes->'movement_type') <> 'string'
      or p_changes->>'movement_type' not in ('ingreso', 'egreso')
    ))
    or (p_changes ? 'amount' and (
      jsonb_typeof(p_changes->'amount') <> 'number'
      or (p_changes->>'amount')::numeric <= 0
    ))
    or (p_changes ? 'description' and (
      jsonb_typeof(p_changes->'description') <> 'string'
      or length(p_changes->>'description') > 1000
    ))
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_CASH_MOVEMENT';
  end if;

  select id into v_register from public.cash_register
  where cashier_id = p_actor and status = 'open' for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'NO_OPEN_REGISTER';
  end if;

  if p_changes is null then
    delete from public.cash_movements
    where id = p_id and cash_register_id = v_register and reference_id is null
    returning * into v_result;
  else
    update public.cash_movements set
      movement_type = case when p_changes ? 'movement_type' then p_changes->>'movement_type' else movement_type end,
      amount = case when p_changes ? 'amount' then (p_changes->>'amount')::numeric else amount end,
      description = case when p_changes ? 'description' then p_changes->>'description' else description end
    where id = p_id and cash_register_id = v_register and reference_id is null
    returning * into v_result;
  end if;
  if not found then return null; end if;
  return to_jsonb(v_result);
end
$$;

create function public.cash_movement_totals(p_start date, p_end date)
returns table(income numeric, expense numeric)
language sql
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(sum(amount) filter (where movement_type = 'ingreso'), 0),
         coalesce(sum(amount) filter (where movement_type = 'egreso'), 0)
  from public.cash_movements
  where (p_start is null or movement_date >= p_start)
    and (p_end is null or movement_date <= p_end);
$$;

revoke all on function public.mutate_manual_cash_movement(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.cash_movement_totals(date, date) from public, anon, authenticated;
grant execute on function public.mutate_manual_cash_movement(uuid, uuid, jsonb) to service_role;
grant execute on function public.cash_movement_totals(date, date) to service_role;

commit;
