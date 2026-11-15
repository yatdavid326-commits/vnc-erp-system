begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('products', 'categories', 'inventory', 'inventory_movements')
  ) then
    raise exception 'Review existing inventory policies before applying this migration';
  end if;
end
$$;

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
revoke all on table public.products, public.categories, public.inventory, public.inventory_movements
  from public, anon, authenticated;

commit;
