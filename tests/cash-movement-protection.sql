-- Run inside a transaction and roll back all fixtures.
set local role service_role;
do $$
declare
  v_actor uuid;
  v_register uuid := gen_random_uuid();
  v_manual uuid := gen_random_uuid();
  v_linked uuid := gen_random_uuid();
  v_result jsonb;
  v_income numeric;
  v_expense numeric;
  v_role text;
  v_privilege text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.cash_movements'::regclass) then
    raise exception 'Cash movement RLS is disabled';
  end if;
  foreach v_role in array array['anon', 'authenticated'] loop
    foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege(v_role, 'public.cash_movements', v_privilege) then
        raise exception '% retains % on cash_movements', v_role, v_privilege;
      end if;
    end loop;
    foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] loop
      if has_any_column_privilege(v_role, 'public.cash_movements', v_privilege) then
        raise exception '% retains column % on cash_movements', v_role, v_privilege;
      end if;
    end loop;
    if has_function_privilege(v_role, 'public.mutate_manual_cash_movement(uuid,uuid,jsonb)', 'execute')
      or has_function_privilege(v_role, 'public.cash_movement_totals(date,date)', 'execute') then
      raise exception '% can execute cash functions', v_role;
    end if;
  end loop;
  if not has_function_privilege('service_role', 'public.mutate_manual_cash_movement(uuid,uuid,jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.cash_movement_totals(date,date)', 'execute') then
    raise exception 'service role lacks cash function access';
  end if;

  select id into v_actor from public.user_profiles
  where is_active and not exists (
    select 1 from public.cash_register where cashier_id = user_profiles.id and status = 'open'
  ) order by id limit 1;
  if v_actor is null then raise exception 'Test requires an active profile without an open register'; end if;
  insert into public.cash_register (id, cashier_id, opening_balance, status)
  values (v_register, v_actor, 0, 'open');
  select income, expense into v_income, v_expense
  from public.cash_movement_totals('1900-01-03', '1900-01-03');
  insert into public.cash_movements (id, cash_register_id, movement_type, amount, reference_id, movement_date, created_by)
  values (v_manual, v_register, 'ingreso', 10, null, '1900-01-03', v_actor),
         (v_linked, v_register, 'egreso', 5, gen_random_uuid(), '1900-01-03', v_actor),
         (gen_random_uuid(), v_register, 'ingreso', 100, null, '1900-01-04', v_actor);
  if not exists (
    select 1 from public.cash_movement_totals('1900-01-03', '1900-01-03')
    where income = v_income + 10 and expense = v_expense + 5
  ) then raise exception 'Cash totals are incorrect'; end if;

  v_result := public.mutate_manual_cash_movement(v_manual, v_actor, '{"amount":12}'::jsonb);
  if (v_result->>'amount')::numeric is distinct from 12 then raise exception 'Manual update failed'; end if;
  if public.mutate_manual_cash_movement(v_linked, v_actor, '{"amount":20}'::jsonb) is not null
    or public.mutate_manual_cash_movement(v_linked, v_actor, null) is not null then
    raise exception 'Linked movement was modified';
  end if;
  begin
    perform public.mutate_manual_cash_movement(v_manual, gen_random_uuid(), null);
    raise exception 'Another user modified the movement';
  exception when raise_exception then
    if sqlerrm <> 'NO_OPEN_REGISTER' then raise; end if;
  end;
  begin
    perform public.mutate_manual_cash_movement(v_manual, v_actor, '{"cash_register_id":"00000000-0000-0000-0000-000000000000"}'::jsonb);
    raise exception 'Register reassignment accepted';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_CASH_MOVEMENT' then raise; end if;
  end;
  v_result := public.mutate_manual_cash_movement(v_manual, v_actor, null);
  if v_result is null or exists(select 1 from public.cash_movements where id = v_manual) then
    raise exception 'Manual deletion failed';
  end if;
  update public.cash_register set status = 'closed' where id = v_register;
  begin
    perform public.mutate_manual_cash_movement(v_linked, v_actor, null);
    raise exception 'Closed register accepted';
  exception when raise_exception then
    if sqlerrm <> 'NO_OPEN_REGISTER' then raise; end if;
  end;
end
$$;
reset role;
