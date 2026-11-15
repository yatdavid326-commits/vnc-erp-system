begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename in ('suppliers', 'proveedores')
  ) then
    raise exception 'Review existing supplier policies before applying this migration';
  end if;
end
$$;

alter table public.suppliers enable row level security;
alter table public.proveedores enable row level security;
revoke all on table public.suppliers, public.proveedores from public, anon, authenticated;

commit;
