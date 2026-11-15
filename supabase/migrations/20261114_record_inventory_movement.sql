begin;

create function public.record_manual_inventory_movement(
  p_id uuid, p_product_id uuid, p_actor_id uuid, p_type text, p_quantity integer, p_notes text
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

  select is_active into product_active from public.products where id = p_product_id for update;
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

  select * into stock from public.inventory where product_id = p_product_id for update;
  if not found then
    if p_type <> 'adjustment' then
      raise exception 'stock_uninitialized' using errcode = 'P0001';
    end if;
    insert into public.inventory (product_id, quantity_on_hand, quantity_reserved)
      values (p_product_id, 0, 0) returning * into stock;
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
    values (p_id, p_product_id, p_type, p_quantity, 'manual', p_notes, p_actor_id);
  update public.inventory set quantity_on_hand = new_quantity::integer, last_updated = now()
    where product_id = p_product_id;
  return jsonb_build_object('already_recorded', false);
end
$$;

revoke all on function public.record_manual_inventory_movement(uuid, uuid, uuid, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.record_manual_inventory_movement(uuid, uuid, uuid, text, integer, text)
  to service_role;

commit;
