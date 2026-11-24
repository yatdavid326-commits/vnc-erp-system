begin;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('cash_register', 'pos_items', 'pos_transacciones', 'pos_transactions')
  ) then
    raise exception 'Review existing POS policies before applying this migration';
  end if;
  if exists (
    select 1
    from pg_attribute
    where attrelid in (
      'public.cash_register'::regclass, 'public.pos_items'::regclass,
      'public.pos_transacciones'::regclass, 'public.pos_transactions'::regclass
    )
      and attnum > 0 and not attisdropped and attacl is not null
  ) then
    raise exception 'Review existing POS column grants before applying this migration';
  end if;
end
$$;

alter table public.cash_register enable row level security;
alter table public.pos_items enable row level security;
alter table public.pos_transacciones enable row level security;
alter table public.pos_transactions enable row level security;

revoke all on table public.cash_register, public.pos_items,
  public.pos_transacciones, public.pos_transactions
  from public, anon, authenticated;

commit;
