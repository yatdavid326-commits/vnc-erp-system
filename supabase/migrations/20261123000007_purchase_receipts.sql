begin;

-- Prevent orders written by the old application from becoming invisible at cutover.
lock table public.compras in access exclusive mode;
do $$
begin
  if exists (select 1 from public.compras) then
    raise exception 'legacy_purchase_orders_exist';
  end if;
end $$;

create or replace function public.reject_legacy_purchase_write()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  raise exception 'legacy_purchase_model_disabled';
end $$;
drop trigger if exists reject_legacy_purchase_write on public.compras;
create trigger reject_legacy_purchase_write before insert or update or delete
  on public.compras for each statement execute function public.reject_legacy_purchase_write();

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  order_date date not null,
  expected_delivery_date date,
  actual_delivery_date date,
  status text default 'pending',
  total_amount numeric not null,
  notes text,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.user_profiles(id),
  edit_version integer not null default 0,
  last_edited_by uuid references public.user_profiles(id)
);
create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity_ordered integer not null,
  quantity_received integer default 0,
  unit_price numeric not null,
  line_total numeric not null,
  created_at timestamptz default now()
);
alter table public.purchase_orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.user_profiles(id),
  add column if not exists edit_version integer not null default 0,
  add column if not exists last_edited_by uuid references public.user_profiles(id);
create table if not exists public.purchase_receipts (
  id uuid primary key,
  order_id uuid not null references public.purchase_orders(id),
  received_by uuid not null references public.user_profiles(id),
  received_date date not null,
  created_at timestamptz not null default now()
);
create table if not exists public.purchase_receipt_items (
  receipt_id uuid not null references public.purchase_receipts(id),
  order_item_id uuid not null references public.purchase_order_items(id),
  quantity integer not null check (quantity > 0),
  primary key (receipt_id, order_item_id)
);
alter table public.purchase_receipts drop constraint if exists purchase_receipts_order_id_key;
create index if not exists purchase_receipts_order_id_idx on public.purchase_receipts(order_id);
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_items enable row level security;
revoke all on public.purchase_orders, public.purchase_order_items,
  public.purchase_receipts, public.purchase_receipt_items from public, anon, authenticated;
grant select, insert, update on public.purchase_orders, public.purchase_order_items,
  public.purchase_receipts, public.purchase_receipt_items to service_role;

create or replace function public.create_purchase_order(
  p_id uuid, p_number text, p_supplier uuid, p_date date, p_notes text,
  p_items jsonb, p_actor uuid
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  existing public.purchase_orders%rowtype;
  item jsonb;
  product uuid;
  qty integer;
  price numeric;
  total numeric := 0;
  supplier_active boolean;
begin
  if p_id is null or p_supplier is null or p_date is null or p_actor is null
    or p_number is null or length(trim(p_number)) = 0 or length(p_number) > 80
    or p_notes is null or length(p_notes) > 500 or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'invalid_purchase' using errcode = 'P0001';
  end if;
  if (select count(distinct x->>'product_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then
    raise exception 'duplicate_product' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into existing from public.purchase_orders where id = p_id;
  if found then
    if existing.po_number = p_number and existing.supplier_id = p_supplier
      and existing.order_date = p_date and existing.notes = p_notes and existing.created_by = p_actor
      and (select count(*) from public.purchase_order_items where purchase_order_id = p_id) = jsonb_array_length(p_items)
      and not exists (
        select 1 from jsonb_array_elements(p_items) x
        where not exists (select 1 from public.purchase_order_items i
          where i.purchase_order_id = p_id and i.product_id = (x->>'product_id')::uuid
            and i.quantity_ordered = (x->>'quantity')::integer and i.unit_price = (x->>'unit_price')::numeric)
      ) then return jsonb_build_object('already_recorded', true); end if;
    raise exception 'purchase_conflict' using errcode = 'P0001';
  end if;
  select is_active into supplier_active from public.suppliers where id = p_supplier for share;
  if supplier_active is not true then raise exception 'supplier_inactive' using errcode = 'P0001'; end if;
  for item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    product := (item->>'product_id')::uuid;
    qty := (item->>'quantity')::integer;
    price := (item->>'unit_price')::numeric;
    if product is null or qty is null or qty <= 0 or price is null or price < 0
      or price > 9999999999.99 or price <> round(price, 2) then
      raise exception 'invalid_purchase' using errcode = 'P0001';
    end if;
    perform 1 from public.products where id = product and is_active is true for share;
    if not found then raise exception 'product_inactive' using errcode = 'P0001'; end if;
    total := total + qty * price;
    if total > 9999999999.99 then raise exception 'total_overflow' using errcode = 'P0001'; end if;
  end loop;
  insert into public.purchase_orders (id, po_number, supplier_id, order_date, status, total_amount, notes, created_by)
    values (p_id, p_number, p_supplier, p_date, 'pending', total, p_notes, p_actor);
  for item in select value from jsonb_array_elements(p_items) loop
    qty := (item->>'quantity')::integer;
    price := (item->>'unit_price')::numeric;
    insert into public.purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price, line_total)
      values (p_id, (item->>'product_id')::uuid, qty, price, qty * price);
  end loop;
  return jsonb_build_object('already_recorded', false);
end $$;

create or replace function public.receive_partial_purchase_order(
  p_order_id uuid, p_receipt_id uuid, p_date date, p_actor uuid, p_items jsonb
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  ord public.purchase_orders%rowtype;
  receipt public.purchase_receipts%rowtype;
  line public.purchase_order_items%rowtype;
  stock public.inventory%rowtype;
  active boolean;
  qty integer;
  complete boolean;
begin
  if p_order_id is null or p_receipt_id is null or p_date is null or p_actor is null
    or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'invalid_receipt' using errcode = 'P0001';
  end if;
  if (select count(distinct x->>'item_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items)
    or exists (select 1 from jsonb_array_elements(p_items) x where (x->>'quantity')::integer <= 0
      or x->>'quantity' is null or x->>'item_id' is null) then
    raise exception 'invalid_receipt' using errcode = 'P0001';
  end if;
  select * into ord from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception 'order_missing' using errcode = 'P0001'; end if;
  select * into receipt from public.purchase_receipts where id = p_receipt_id;
  if found then
    if receipt.order_id = p_order_id and receipt.received_by = p_actor and receipt.received_date = p_date
      and (select count(*) from public.purchase_receipt_items where receipt_id = p_receipt_id) = jsonb_array_length(p_items)
      and not exists (
        select 1 from jsonb_array_elements(p_items) x
        where not exists (select 1 from public.purchase_receipt_items ri
          where ri.receipt_id = p_receipt_id and ri.order_item_id = (x->>'item_id')::uuid
            and ri.quantity = (x->>'quantity')::integer)
      ) then return jsonb_build_object('already_recorded', true); end if;
    raise exception 'receipt_conflict' using errcode = 'P0001';
  end if;
  if ord.status not in ('pending', 'partially_received') or ord.status is null then
    raise exception 'order_not_pending' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id)
    or exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id
      and (quantity_ordered <= 0 or quantity_received is null or quantity_received < 0 or quantity_received > quantity_ordered))
    or exists (select product_id from public.purchase_order_items where purchase_order_id = p_order_id group by product_id having count(*) > 1)
    or (ord.status = 'pending' and exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id and quantity_received <> 0))
    or (ord.status = 'partially_received' and not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id and quantity_received > 0))
    or not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id and quantity_received < quantity_ordered) then
    raise exception 'invalid_order_items' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) x where not exists (
    select 1 from public.purchase_order_items i where i.purchase_order_id = p_order_id and i.id = (x->>'item_id')::uuid
  )) then raise exception 'invalid_order_items' using errcode = 'P0001'; end if;

  insert into public.purchase_receipts (id, order_id, received_by, received_date)
    values (p_receipt_id, p_order_id, p_actor, p_date);
  for line in select * from public.purchase_order_items
    where purchase_order_id = p_order_id and id in (select (x->>'item_id')::uuid from jsonb_array_elements(p_items) x)
    order by product_id for update loop
    select (x->>'quantity')::integer into qty from jsonb_array_elements(p_items) x where (x->>'item_id')::uuid = line.id;
    if qty > line.quantity_ordered - line.quantity_received then raise exception 'quantity_exceeded' using errcode = 'P0001'; end if;
    select is_active into active from public.products where id = line.product_id for update;
    if not found or active is not true then raise exception 'product_inactive' using errcode = 'P0001'; end if;
    select * into stock from public.inventory where product_id = line.product_id for update;
    if not found then raise exception 'stock_uninitialized' using errcode = 'P0001'; end if;
    if stock.quantity_on_hand is null or stock.quantity_reserved is null or stock.quantity_on_hand < 0
      or stock.quantity_reserved < 0 or stock.quantity_reserved > stock.quantity_on_hand then
      raise exception 'invalid_stock' using errcode = 'P0001';
    end if;
    if stock.quantity_on_hand::bigint + qty > 2147483647 then raise exception 'stock_overflow' using errcode = 'P0001'; end if;
    update public.inventory set quantity_on_hand = quantity_on_hand + qty, last_updated = now() where product_id = line.product_id;
    insert into public.inventory_movements (product_id, movement_type, quantity, reference_id, reference_type, notes, created_by)
      values (line.product_id, 'entry', qty, p_receipt_id, 'purchase', 'Recepción de orden ' || ord.po_number, p_actor);
    update public.purchase_order_items set quantity_received = quantity_received + qty where id = line.id;
    insert into public.purchase_receipt_items (receipt_id, order_item_id, quantity) values (p_receipt_id, line.id, qty);
  end loop;
  select not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id
    and quantity_received < quantity_ordered) into complete;
  update public.purchase_orders set status = case when complete then 'received' else 'partially_received' end,
    actual_delivery_date = case when complete then p_date else null end, updated_at = now() where id = p_order_id;
  return jsonb_build_object('already_recorded', false, 'complete', complete);
end $$;

create or replace function public.cancel_pending_purchase_order(p_order_id uuid, p_actor uuid)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare ord public.purchase_orders%rowtype;
begin
  if p_order_id is null or p_actor is null then raise exception 'invalid_cancellation' using errcode = 'P0001'; end if;
  select * into ord from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception 'order_missing' using errcode = 'P0001'; end if;
  if ord.status = 'cancelled' and ord.cancelled_at is not null and ord.cancelled_by is not null then
    return jsonb_build_object('already_cancelled', true);
  end if;
  if ord.status is distinct from 'pending' then raise exception 'order_not_cancellable' using errcode = 'P0001'; end if;
  if ord.cancelled_at is not null or ord.cancelled_by is not null
    or exists (select 1 from public.purchase_receipts where order_id = p_order_id)
    or not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id)
    or exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id
      and (quantity_ordered <= 0 or quantity_received is distinct from 0)) then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;
  update public.purchase_orders set status = 'cancelled', cancelled_at = now(), cancelled_by = p_actor, updated_at = now()
    where id = p_order_id;
  return jsonb_build_object('already_cancelled', false);
end $$;

create or replace function public.edit_pending_purchase_details(
  p_order_id uuid, p_actor uuid, p_date date, p_notes text, p_version integer
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare ord public.purchase_orders%rowtype;
begin
  if p_order_id is null or p_actor is null or p_date is null or p_notes is null
    or length(p_notes) > 500 or p_version is null or p_version < 0 then
    raise exception 'invalid_details' using errcode = 'P0001';
  end if;
  select * into ord from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception 'order_missing' using errcode = 'P0001'; end if;
  if ord.status is distinct from 'pending' then raise exception 'order_not_editable' using errcode = 'P0001'; end if;
  if ord.edit_version <> p_version then raise exception 'order_changed' using errcode = 'P0001'; end if;
  if ord.cancelled_at is not null or ord.cancelled_by is not null
    or exists (select 1 from public.purchase_receipts where order_id = p_order_id)
    or not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id)
    or exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id
      and (quantity_ordered <= 0 or quantity_received is distinct from 0)) then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;
  if ord.edit_version = 2147483647 then raise exception 'version_overflow' using errcode = 'P0001'; end if;
  update public.purchase_orders set order_date = p_date, notes = p_notes, edit_version = edit_version + 1,
    last_edited_by = p_actor, updated_at = now() where id = p_order_id;
  return jsonb_build_object('edit_version', ord.edit_version + 1);
end $$;

create or replace function public.get_purchase_total()
returns numeric language sql stable security invoker set search_path = pg_catalog, public as $$
  select coalesce(sum(total_amount), 0) from public.purchase_orders;
$$;

revoke all on function public.create_purchase_order(uuid, text, uuid, date, text, jsonb, uuid),
  public.receive_partial_purchase_order(uuid, uuid, date, uuid, jsonb),
  public.cancel_pending_purchase_order(uuid, uuid),
  public.edit_pending_purchase_details(uuid, uuid, date, text, integer),
  public.get_purchase_total() from public, anon, authenticated;
grant execute on function public.create_purchase_order(uuid, text, uuid, date, text, jsonb, uuid),
  public.receive_partial_purchase_order(uuid, uuid, date, uuid, jsonb),
  public.cancel_pending_purchase_order(uuid, uuid),
  public.edit_pending_purchase_details(uuid, uuid, date, text, integer),
  public.get_purchase_total() to service_role;

do $$
begin
  if to_regprocedure('public.receive_purchase_order(uuid,uuid,date,uuid)') is not null then
    revoke all on function public.receive_purchase_order(uuid, uuid, date, uuid)
      from public, anon, authenticated, service_role;
  end if;
end $$;
commit;
