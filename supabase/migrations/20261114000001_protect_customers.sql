begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
  ) then
    raise exception 'Review existing customers policies before applying this migration';
  end if;
end
$$;

alter table public.customers enable row level security;
revoke all on table public.customers from public, anon, authenticated;

commit;
