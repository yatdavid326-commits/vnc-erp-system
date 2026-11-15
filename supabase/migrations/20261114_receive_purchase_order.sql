begin;

create table public.purchase_receipts (
  id uuid primary key,
  order_id uuid not null unique references public.purchase_orders(id),
  received_by uuid not null references public.user_profiles(id),
  received_date date not null,
  created_at timestamptz not null default now()
);
alter table public.purchase_receipts enable row level security;
revoke all on table public.purchase_receipts from public, anon, authenticated;
grant select, insert on table public.purchase_receipts to service_role;

create function public.receive_purchase_order(
  p_order_id uuid, p_receipt_id uuid, p_date date, p_actor uuid
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare
  ord public.purchase_orders%rowtype;
  receipt public.purchase_receipts%rowtype;
  line public.purchase_order_items%rowtype;
  stock public.inventory%rowtype;
  active boolean;
begin
  if p_order_id is null or p_receipt_id is null or p_date is null or p_actor is null then
    raise exception 'invalid_receipt' using errcode = 'P0001';
  end if;

  select * into ord from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception 'order_missing' using errcode = 'P0001'; end if;

  select * into receipt from public.purchase_receipts where order_id = p_order_id;
  if found then
    if receipt.id = p_receipt_id and receipt.received_by = p_actor and receipt.received_date = p_date then
      return jsonb_build_object('already_recorded', true);
    end if;
    raise exception 'order_already_received' using errcode = 'P0001';
  end if;
  if ord.status is distinct from 'pending' then
    raise exception 'order_not_pending' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id)
    or exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id
      and (quantity_ordered <= 0 or quantity_received is distinct from 0))
    or exists (select product_id from public.purchase_order_items where purchase_order_id = p_order_id
      group by product_id having count(*) > 1) then
    raise exception 'invalid_order_items' using errcode = 'P0001';
  end if;

  for line in select * from public.purchase_order_items where purchase_order_id = p_order_id
    order by product_id for update loop
    select is_active into active from public.products where id = line.product_id for update;
    if not found or active is not true then raise exception 'product_inactive' using errcode = 'P0001'; end if;
    select * into stock from public.inventory where product_id = line.product_id for update;
    if not found then raise exception 'stock_uninitialized' using errcode = 'P0001'; end if;
    if stock.quantity_on_hand is null or stock.quantity_reserved is null
      or stock.quantity_on_hand < 0 or stock.quantity_reserved < 0
      or stock.quantity_reserved > stock.quantity_on_hand then
      raise exception 'invalid_stock' using errcode = 'P0001';
    end if;
    if stock.quantity_on_hand::bigint + line.quantity_ordered > 2147483647 then
      raise exception 'stock_overflow' using errcode = 'P0001';
    end if;
    update public.inventory set quantity_on_hand = quantity_on_hand + line.quantity_ordered, last_updated = now()
      where product_id = line.product_id;
    insert into public.inventory_movements (product_id, movement_type, quantity, reference_id, reference_type, notes, created_by)
      values (line.product_id, 'entry', line.quantity_ordered, p_order_id, 'purchase',
        'Recepción de orden ' || ord.po_number, p_actor);
    update public.purchase_order_items set quantity_received = quantity_ordered where id = line.id;
  end loop;

  insert into public.purchase_receipts (id, order_id, received_by, received_date)
    values (p_receipt_id, p_order_id, p_actor, p_date);
  update public.purchase_orders set status = 'received', actual_delivery_date = p_date, updated_at = now()
    where id = p_order_id;
  return jsonb_build_object('already_recorded', false);
end $$;

revoke all on function public.receive_purchase_order(uuid, uuid, date, uuid) from public, anon, authenticated;
grant execute on function public.receive_purchase_order(uuid, uuid, date, uuid) to service_role;
commit;
