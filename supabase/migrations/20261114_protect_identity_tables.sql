begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('user_profiles', 'user_modules', 'modules')
      and policyname = 'erp_deny_direct_access'
  ) then
    raise exception 'Review existing direct-access policies before applying this migration';
  end if;
end
$$;

alter table public.user_profiles enable row level security;
alter table public.user_modules enable row level security;
alter table public.modules enable row level security;

create policy erp_deny_direct_access on public.user_profiles
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy erp_deny_direct_access on public.user_modules
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy erp_deny_direct_access on public.modules
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.user_profiles, public.user_modules, public.modules
  from public, anon, authenticated;

commit;
