begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_logs'
  ) or exists (
    select 1 from pg_attribute
    where attrelid = 'public.audit_logs'::regclass
      and attnum > 0 and not attisdropped and attacl is not null
  ) then
    raise exception 'Review existing audit log policies and column grants';
  end if;
end
$$;

alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from public, anon, authenticated;

commit;
