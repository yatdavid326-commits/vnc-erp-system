begin;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['user_profiles', 'user_modules', 'modules'] loop
    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = 'erp_deny_direct_access'
        and (
          permissive <> 'RESTRICTIVE'
          or not (roles @> array['anon', 'authenticated']::name[])
          or cmd <> 'ALL'
          or qual is distinct from 'false'
          or with_check is distinct from 'false'
        )
    ) then
      raise exception 'Existing erp_deny_direct_access policy is not restrictive on %', target_table;
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = 'erp_deny_direct_access'
    ) then
      execute format(
        'create policy erp_deny_direct_access on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
        target_table
      );
    end if;
  end loop;
end
$$;

alter table public.user_profiles enable row level security;
alter table public.user_modules enable row level security;
alter table public.modules enable row level security;

revoke all on table public.user_profiles, public.user_modules, public.modules
  from public, anon, authenticated;

commit;
