-- Run inside a transaction and roll back all fixtures.
do $$
declare
  v_table text;
  v_role text;
  v_privilege text;
begin
  foreach v_table in array array['employees', 'attendance', 'empleados', 'asistencia'] loop
    if not (select relrowsecurity from pg_class where oid = format('public.%I', v_table)::regclass) then
      raise exception 'RLS is disabled on %', v_table;
    end if;
    foreach v_role in array array['anon', 'authenticated'] loop
      foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(v_role, format('public.%I', v_table), v_privilege) then
          raise exception '% retains % on %', v_role, v_privilege, v_table;
        end if;
      end loop;
      foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] loop
        if has_any_column_privilege(v_role, format('public.%I', v_table), v_privilege) then
          raise exception '% retains column % on %', v_role, v_privilege, v_table;
        end if;
      end loop;
    end loop;
    foreach v_privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if not has_table_privilege('service_role', format('public.%I', v_table), v_privilege) then
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
  foreach v_table in array array['employees', 'attendance', 'empleados', 'asistencia'] loop
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
  foreach v_table in array array['employees', 'attendance', 'empleados', 'asistencia'] loop
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

set local role service_role;
do $$
declare
  v_table text;
  v_employee uuid := gen_random_uuid();
  v_attendance uuid := gen_random_uuid();
begin
  foreach v_table in array array['employees', 'attendance', 'empleados', 'asistencia'] loop
    execute format('select 1 from public.%I limit 0', v_table);
  end loop;
  insert into public.empleados (id, nombre, estado)
    values (v_employee, 'VNC employee RLS rollback', true);
  insert into public.asistencia (id, empleado_id, fecha, hora_entrada)
    values (v_attendance, v_employee, '1900-01-03', '08:00');
  update public.asistencia set hora_salida = '17:00' where id = v_attendance;
  if not exists (
    select 1 from public.asistencia where id = v_attendance and hora_salida = '17:00'
  ) then raise exception 'Service attendance update failed'; end if;
  delete from public.asistencia where id = v_attendance;
  delete from public.empleados where id = v_employee;
  if exists (select 1 from public.asistencia where id = v_attendance)
    or exists (select 1 from public.empleados where id = v_employee) then
    raise exception 'Service fixture deletion failed';
  end if;
end
$$;
reset role;
