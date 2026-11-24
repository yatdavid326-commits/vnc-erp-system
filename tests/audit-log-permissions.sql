-- Run inside a transaction and roll back all fixtures.
do $$
declare
  v_role text;
  v_privilege text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass) then
    raise exception 'RLS is disabled on audit_logs';
  end if;
  foreach v_role in array array['anon', 'authenticated'] loop
    foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege(v_role, 'public.audit_logs', v_privilege) then
        raise exception '% retains % on audit_logs', v_role, v_privilege;
      end if;
    end loop;
    foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] loop
      if has_any_column_privilege(v_role, 'public.audit_logs', v_privilege) then
        raise exception '% retains column % on audit_logs', v_role, v_privilege;
      end if;
    end loop;
  end loop;
  foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
    if not has_table_privilege('service_role', 'public.audit_logs', v_privilege) then
      raise exception 'service_role lacks % on audit_logs', v_privilege;
    end if;
  end loop;
end
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.audit_logs limit 1;
    raise exception 'anon can read audit_logs';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.audit_logs (action) values ('VNC rollback test');
    raise exception 'anon can insert audit_logs';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;

set local role authenticated;
do $$
begin
  begin
    perform 1 from public.audit_logs limit 1;
    raise exception 'authenticated can read audit_logs';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.audit_logs (action) values ('VNC rollback test');
    raise exception 'authenticated can insert audit_logs';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;

set local role service_role;
do $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.audit_logs (id, action) values (v_id, 'VNC rollback test');
  update public.audit_logs set action = 'VNC rollback updated' where id = v_id;
  if not exists (
    select 1 from public.audit_logs where id = v_id and action = 'VNC rollback updated'
  ) then
    raise exception 'Service audit log update failed';
  end if;
  delete from public.audit_logs where id = v_id;
  if exists (select 1 from public.audit_logs where id = v_id) then
    raise exception 'Service audit log deletion failed';
  end if;
end
$$;
reset role;
