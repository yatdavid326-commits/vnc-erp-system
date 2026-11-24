begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('employees', 'attendance', 'empleados', 'asistencia')
  ) or exists (
    select 1 from pg_attribute
    where attrelid in (
      'public.employees'::regclass, 'public.attendance'::regclass,
      'public.empleados'::regclass, 'public.asistencia'::regclass
    ) and attnum > 0 and not attisdropped and attacl is not null
  ) then
    raise exception 'Review existing employee and attendance policies and column grants';
  end if;
end
$$;

alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.empleados enable row level security;
alter table public.asistencia enable row level security;

revoke all on table public.employees, public.attendance, public.empleados, public.asistencia
  from public, anon, authenticated;

commit;
