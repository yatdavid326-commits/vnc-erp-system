-- Run inside a transaction and roll back all fixtures.
do $$
declare
  v_actor uuid;
  v_log public.audit_logs;
  v_count integer;
begin
  select id into strict v_actor
  from public.user_profiles
  where is_active = true
  order by id
  limit 1;

  v_log := public.write_audit_log(
    v_actor,
    'VNC_AUDIT_ROLLBACK_TEST',
    'user_modules',
    gen_random_uuid(),
    '{"can_edit": false}'::jsonb,
    '{"can_edit": true}'::jsonb,
    '127.0.0.1'::inet
  );

  select count(*) into v_count
  from public.audit_logs
  where id = v_log.id
    and user_id = v_actor
    and action = 'VNC_AUDIT_ROLLBACK_TEST'
    and old_values->>'can_edit' = 'false'
    and new_values->>'can_edit' = 'true';
  if v_count <> 1 then raise exception 'Audit log was not recorded correctly'; end if;

  if has_function_privilege('authenticated', 'public.write_audit_log(uuid,text,text,uuid,jsonb,jsonb,inet)', 'execute')
    or has_function_privilege('anon', 'public.write_audit_log(uuid,text,text,uuid,jsonb,jsonb,inet)', 'execute')
    or not has_function_privilege('service_role', 'public.write_audit_log(uuid,text,text,uuid,jsonb,jsonb,inet)', 'execute') then
    raise exception 'Incorrect audit function privileges';
  end if;
end
$$;
