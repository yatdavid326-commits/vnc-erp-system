begin;

alter table public.customers
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists status text;

alter table public.customers
  alter column customer_number set default (
    'CUST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  );

update public.customers
set status = case when is_active is true then 'activo' else 'inactivo' end
where status is null;

alter table public.customers
  alter column status set default 'activo',
  alter column status set not null;

alter table public.suppliers
  add column if not exists state text,
  add column if not exists updated_at timestamptz;

alter table public.suppliers
  alter column supplier_number set default (
    'SUP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.suppliers
set created_at = now()
where created_at is null;

update public.suppliers
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.suppliers
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.suppliers enable row level security;
revoke all on table public.suppliers from public, anon, authenticated;
grant select, insert, update, delete on table public.suppliers to service_role;

alter table public.inventory_movements
  alter column created_at set default now();

update public.inventory_movements
set created_at = now()
where created_at is null;

alter table public.inventory_movements
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inventory_movements'::regclass
      and conname = 'inventory_movements_movement_type_check'
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_movement_type_check
      check (movement_type in ('entry', 'exit', 'adjustment', 'salida'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inventory_movements'::regclass
      and conname = 'inventory_movements_quantity_check'
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_quantity_check
      check (quantity >= 0);
  end if;
end
$$;

alter table public.inventory_movements enable row level security;
revoke all on table public.inventory_movements from public, anon, authenticated;
grant select, insert on table public.inventory_movements to service_role;

create index if not exists inventory_movements_product_created_idx
  on public.inventory_movements (product_id, created_at desc);

alter table public.inventory
  drop constraint inventory_product_id_fkey;
alter table public.inventory
  add constraint inventory_product_id_fkey
  foreign key (product_id)
  references public.products (id)
  on delete cascade;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_status_check'
  ) then
    alter table public.customers
      add constraint customers_status_check
      check (status in ('activo', 'inactivo', 'suspendido'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.compras'::regclass
      and conname = 'compras_proveedor_id_fkey'
  ) then
    alter table public.compras
      add constraint compras_proveedor_id_fkey
      foreign key (proveedor_id)
      references public.suppliers (id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.asistencia'::regclass
      and conname = 'asistencia_empleado_id_fkey'
  ) then
    alter table public.asistencia
      add constraint asistencia_empleado_id_fkey
      foreign key (empleado_id)
      references public.empleados (id)
      on delete restrict;
  end if;
end
$$;

alter table public.cash_movements
  add column if not exists reference_number text,
  add column if not exists movement_date date;

update public.cash_movements
set movement_date = coalesce(movement_date, created_at::date, current_date)
where movement_date is null;

alter table public.cash_movements
  alter column movement_date set default current_date,
  alter column movement_date set not null;

create or replace function public.ensure_product_inventory()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  insert into public.inventory (product_id, quantity_on_hand, quantity_reserved)
  values (new.id, 0, 0)
  on conflict (product_id) do nothing;
  return new;
end
$$;

revoke all on function public.ensure_product_inventory() from public, anon, authenticated;
grant execute on function public.ensure_product_inventory() to service_role;

drop trigger if exists products_create_inventory on public.products;
create trigger products_create_inventory
  after insert on public.products
  for each row execute function public.ensure_product_inventory();

create or replace function public.prevent_product_delete_with_stock()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.inventory
    where product_id = old.id
      and (
        coalesce(quantity_on_hand, 0) > 0
        or coalesce(quantity_reserved, 0) > 0
      )
  ) then
    raise exception 'product_has_stock' using errcode = 'P0001';
  end if;
  return old;
end
$$;

revoke all on function public.prevent_product_delete_with_stock() from public, anon, authenticated;
grant execute on function public.prevent_product_delete_with_stock() to service_role;

drop trigger if exists products_prevent_delete_with_stock on public.products;
create trigger products_prevent_delete_with_stock
  before delete on public.products
  for each row execute function public.prevent_product_delete_with_stock();

create or replace function public.record_manual_inventory_movement(
  p_id uuid,
  p_product_id uuid,
  p_actor_id uuid,
  p_type text,
  p_quantity integer,
  p_notes text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  product_active boolean;
  existing public.inventory_movements%rowtype;
  stock public.inventory%rowtype;
  new_quantity bigint;
begin
  if p_id is null or p_product_id is null or p_actor_id is null
    or p_type is null or p_type not in ('entry', 'exit', 'adjustment')
    or p_quantity is null or p_quantity < 0
    or (p_type <> 'adjustment' and p_quantity = 0)
    or p_notes is null or char_length(trim(p_notes)) = 0 or char_length(p_notes) > 500 then
    raise exception 'invalid_movement' using errcode = 'P0001';
  end if;

  select is_active into product_active
  from public.products
  where id = p_product_id
  for update;
  if not found then
    raise exception 'product_missing' using errcode = 'P0001';
  end if;

  select * into existing from public.inventory_movements where id = p_id;
  if found then
    if existing.product_id = p_product_id and existing.created_by = p_actor_id
      and existing.reference_type = 'manual' and existing.movement_type = p_type
      and existing.quantity = p_quantity and existing.notes = p_notes then
      return jsonb_build_object('already_recorded', true);
    end if;
    raise exception 'movement_conflict' using errcode = 'P0001';
  end if;
  if product_active is not true then
    raise exception 'product_inactive' using errcode = 'P0001';
  end if;

  select * into stock
  from public.inventory
  where product_id = p_product_id
  for update;
  if not found then
    if p_type <> 'adjustment' then
      raise exception 'stock_uninitialized' using errcode = 'P0001';
    end if;
    insert into public.inventory (product_id, quantity_on_hand, quantity_reserved)
    values (p_product_id, 0, 0)
    returning * into stock;
  end if;

  if stock.quantity_on_hand is null or stock.quantity_reserved is null
    or stock.quantity_on_hand < 0 or stock.quantity_reserved < 0
    or stock.quantity_reserved > stock.quantity_on_hand then
    raise exception 'invalid_stock' using errcode = 'P0001';
  end if;

  new_quantity := case p_type
    when 'entry' then stock.quantity_on_hand::bigint + p_quantity
    when 'exit' then stock.quantity_on_hand::bigint - p_quantity
    else p_quantity
  end;
  if new_quantity < stock.quantity_reserved then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;
  if new_quantity > 2147483647 then
    raise exception 'stock_overflow' using errcode = 'P0001';
  end if;

  insert into public.inventory_movements
    (id, product_id, movement_type, quantity, reference_type, notes, created_by)
  values
    (p_id, p_product_id, p_type, p_quantity, 'manual', p_notes, p_actor_id);
  update public.inventory
  set quantity_on_hand = new_quantity::integer, last_updated = now()
  where product_id = p_product_id;
  return jsonb_build_object('already_recorded', false);
end
$$;

revoke all on function public.record_manual_inventory_movement(uuid, uuid, uuid, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.record_manual_inventory_movement(uuid, uuid, uuid, text, integer, text)
  to service_role;

commit;
