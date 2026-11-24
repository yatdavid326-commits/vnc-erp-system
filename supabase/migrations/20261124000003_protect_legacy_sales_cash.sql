begin;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('sales', 'sale_items', 'cajas')
  ) or exists (
    select 1 from pg_attribute
    where attrelid in (
      'public.sales'::regclass,
      'public.sale_items'::regclass,
      'public.cajas'::regclass
    )
      and attnum > 0 and not attisdropped and attacl is not null
  ) then
    raise exception 'Review existing legacy sales and cash policies and column grants';
  end if;
end
$$;

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.cajas enable row level security;

revoke all on table public.sales, public.sale_items, public.cajas
  from public, anon, authenticated;

commit;
