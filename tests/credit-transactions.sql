do $$
declare
  v_customer uuid;
  v_user uuid;
  v_purchase uuid := gen_random_uuid();
  v_time timestamptz := now();
  v_balance numeric;
  v_count integer;
begin
  select id into v_user from public.user_profiles where is_active = true limit 1;
  if v_user is null then raise exception 'An active test profile is required'; end if;
  insert into public.customers (name, email, credit_limit, current_balance)
    values ('Temporal prueba crédito', 'credit-test@example.invalid', 100, 0)
    returning id into v_customer;

  perform public.create_credit_transaction(v_purchase, v_customer, 80, 'compra', null, v_time, v_user);
  perform public.create_credit_transaction(v_purchase, v_customer, 80, 'compra', null, v_time, v_user);
  select current_balance into v_balance from public.customers where id = v_customer;
  select count(*) into v_count from public.credit_transactions where cliente_id = v_customer;
  if v_balance <> 80 or v_count <> 1 then raise exception 'Idempotent purchase failed'; end if;

  begin
    perform public.create_credit_transaction(v_purchase, v_customer, 81, 'compra', null, v_time, v_user);
    raise exception 'Expected idempotency conflict';
  exception when raise_exception then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;
  begin
    perform public.create_credit_transaction(gen_random_uuid(), v_customer, 21, 'compra', null, v_time, v_user);
    raise exception 'Expected credit limit rejection';
  exception when raise_exception then
    if sqlerrm <> 'CREDIT_LIMIT_EXCEEDED' then raise; end if;
  end;
  begin
    perform public.create_credit_transaction(gen_random_uuid(), v_customer, 81, 'pago', null, v_time, v_user);
    raise exception 'Expected payment rejection';
  exception when raise_exception then
    if sqlerrm <> 'INSUFFICIENT_BALANCE' then raise; end if;
  end;

  perform public.create_credit_transaction(gen_random_uuid(), v_customer, 10, 'pago', null, v_time, v_user);
  perform public.create_credit_transaction(gen_random_uuid(), v_customer, -20, 'ajuste', null, v_time, v_user);
  perform public.create_credit_transaction(gen_random_uuid(), v_customer, 5, 'ajuste', null, v_time, v_user);
  select current_balance into v_balance from public.customers where id = v_customer;
  select count(*) into v_count from public.credit_transactions where cliente_id = v_customer;
  if v_balance <> 55 or v_count <> 4 then raise exception 'Payment or adjustment failed'; end if;
  begin
    perform public.create_credit_transaction(gen_random_uuid(), v_customer, -56, 'ajuste', null, v_time, v_user);
    raise exception 'Expected adjustment rejection';
  exception when raise_exception then
    if sqlerrm <> 'INSUFFICIENT_BALANCE' then raise; end if;
  end;
  if has_table_privilege('authenticated', 'public.credit_transactions', 'select')
    or has_function_privilege('authenticated', 'public.create_credit_transaction(uuid,uuid,numeric,text,text,timestamptz,uuid)', 'execute')
    or not has_function_privilege('service_role', 'public.create_credit_transaction(uuid,uuid,numeric,text,text,timestamptz,uuid)', 'execute') then
    raise exception 'Incorrect credit permissions';
  end if;
end;
$$;
