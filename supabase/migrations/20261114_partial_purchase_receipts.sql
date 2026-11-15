begin;

alter table public.purchase_receipts drop constraint purchase_receipts_order_id_key;
create index purchase_receipts_order_id_idx on public.purchase_receipts(order_id);
create table public.purchase_receipt_items (
  receipt_id uuid not null references public.purchase_receipts(id),
  order_item_id uuid not null references public.purchase_order_items(id),
  quantity integer not null check (quantity > 0),
  primary key (receipt_id, order_item_id)
);
alter table public.purchase_receipt_items enable row level security;
revoke all on table public.purchase_receipt_items from public, anon, authenticated;
grant select, insert on table public.purchase_receipt_items to service_role;

create function public.receive_partial_purchase_order(
  p_order_id uuid, p_receipt_id uuid, p_date date, p_actor uuid, p_items jsonb
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public
as $$
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
    if qty > line.quantity_ordered - line.quantity_received then
      raise exception 'quantity_exceeded' using errcode = 'P0001';
    end if;
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

revoke all on function public.receive_partial_purchase_order(uuid, uuid, date, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.receive_partial_purchase_order(uuid, uuid, date, uuid, jsonb) to service_role;
commit;
