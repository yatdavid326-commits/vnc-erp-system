-- Run inside a transaction and roll back after execution.
do $$
declare
  first_key text := repeat('a', 64);
  second_key text := repeat('b', 64);
  result jsonb;
begin
  if exists (select 1 from public.signin_attempts where client_key in (first_key, second_key)) then
    raise exception 'Test keys are already in use';
  end if;

  for i in 1..20 loop
    result := public.consume_signin_attempt(first_key);
    if result <> '{"allowed": true, "retry_after": 0}'::jsonb then
      raise exception 'Attempt % should be allowed: %', i, result;
    end if;
  end loop;

  result := public.consume_signin_attempt(first_key);
  if (result->>'allowed')::boolean is not false
    or (result->>'retry_after')::integer not between 1 and 900 then
    raise exception 'Attempt 21 should be limited: %', result;
  end if;
  if (select count(*) from public.signin_attempts where client_key = first_key) <> 20 then
    raise exception 'Rejected attempt should not extend the limit';
  end if;

  result := public.consume_signin_attempt(second_key);
  if (result->>'allowed')::boolean is not true then
    raise exception 'Another client should be allowed';
  end if;

  update public.signin_attempts
  set attempted_at = clock_timestamp() - interval '16 minutes'
  where client_key = first_key;
  result := public.consume_signin_attempt(first_key);
  if (result->>'allowed')::boolean is not true
    or (select count(*) from public.signin_attempts where client_key = first_key) <> 1 then
    raise exception 'Expired window should allow a new attempt';
  end if;

  begin
    perform public.consume_signin_attempt('invalid');
    raise exception 'Expected invalid key error';
  exception when raise_exception then
    if sqlerrm <> 'invalid_signin_client_key' then raise; end if;
  end;
  if has_table_privilege('authenticated', 'public.signin_attempts', 'select')
    or has_function_privilege('authenticated', 'public.consume_signin_attempt(text)', 'execute')
    or not has_function_privilege('service_role', 'public.consume_signin_attempt(text)', 'execute') then
    raise exception 'Incorrect rate limiter permissions';
  end if;
end;
$$;

set local role service_role;
do $$
declare
  result jsonb;
begin
  result := public.consume_signin_attempt(repeat('d', 64));
  if (result->>'allowed')::boolean is not true then
    raise exception 'Service role could not consume an attempt';
  end if;
end;
$$;
reset role;
