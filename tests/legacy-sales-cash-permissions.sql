-- Run inside a transaction and roll back all checks and fixtures.
do $$
declare
  v_table text;
  v_role text;
  v_privilege text;
begin
  foreach v_table in array array['sales', 'sale_items', 'cajas'] loop
    if not (select relrowsecurity
            from pg_class
            where oid = format('public.%I', v_table)::regclass) then
      raise exception 'RLS is disabled on %', v_table;
    end if;

    foreach v_role in array array['anon', 'authenticated'] loop
      foreach v_privilege in array array[
        'SELECT', 'INSERT', 'UPDATE', 'DELETE',
        'TRUNCATE', 'REFERENCES', 'TRIGGER'
      ] loop
        if has_table_privilege(
          v_role,
          format('public.%I', v_table),
          v_privilege
        ) then
          raise exception '% retains % on %', v_role, v_privilege, v_table;
        end if;
      end loop;

      foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] loop
        if has_any_column_privilege(
          v_role,
          format('public.%I', v_table),
          v_privilege
        ) then
          raise exception '% retains column % on %', v_role, v_privilege, v_table;
        end if;
      end loop;
    end loop;

    foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if not has_table_privilege(
        'service_role',
        format('public.%I', v_table),
        v_privilege
      ) then
        raise exception 'service_role lacks % on %', v_privilege, v_table;
      end if;
    end loop;
  end loop;
end
$$;

set local role anon;
do $$
declare
  v_table text;
begin
  foreach v_table in array array['sales', 'sale_items', 'cajas'] loop
    begin
      execute format('select 1 from public.%I limit 0', v_table);
      raise exception 'anon can read %', v_table;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end
$$;
reset role;

set local role authenticated;
do $$
declare
  v_table text;
begin
  foreach v_table in array array['sales', 'sale_items', 'cajas'] loop
    begin
      execute format('select 1 from public.%I limit 0', v_table);
      raise exception 'authenticated can read %', v_table;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end
$$;
reset role;
