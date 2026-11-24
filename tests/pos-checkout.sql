-- Run inside a transaction, with these settings pointing to isolated test fixtures:
-- vnc_test.product_id and vnc_test.register_id. Roll back after execution.
do $$
declare
  v_product uuid := current_setting('vnc_test.product_id')::uuid;
  v_register uuid := current_setting('vnc_test.register_id')::uuid;
  v_user uuid;
  v_inventory uuid;
  v_price numeric;
  v_before integer;
  v_sale jsonb;
  v_sale_id uuid;
  v_count integer;
begin
  select cashier_id into strict v_user
  from public.cash_register where id = v_register and status = 'open';
  select inventory.id, inventory.quantity_on_hand, products.selling_price
  into strict v_inventory, v_before, v_price
  from public.inventory
  join public.products on products.id = inventory.product_id
  where products.id = v_product and products.is_active;
  if v_before < 3 or v_price <= 0 then raise exception 'Invalid test fixture'; end if;

  v_sale := public.create_pos_sale(
    v_user, null, 'tarjeta', 0,
    jsonb_build_array(jsonb_build_object('inventory_id', v_inventory, 'quantity', 2))
  );
  v_sale_id := (v_sale->>'id')::uuid;
  if (v_sale->>'monto_total')::numeric <> 2 * v_price then
    raise exception 'Incorrect sale total';
  end if;
  select count(*) into v_count from public.pos_items
  where transaction_id = v_sale_id and product_id = v_inventory
    and quantity = 2 and unit_price = v_price and subtotal = 2 * v_price;
  if v_count <> 1 then raise exception 'Incorrect sale item'; end if;
  if (select quantity_on_hand from public.inventory where id = v_inventory) <> v_before - 2 then
    raise exception 'Incorrect stock after sale';
  end if;
  select count(*) into v_count from public.inventory_movements
  where product_id = v_product and reference_id = v_sale_id
    and movement_type = 'salida' and quantity = 2;
  if v_count <> 1 then raise exception 'Incorrect inventory movement'; end if;
  if exists (select 1 from public.cash_movements where reference_id = v_sale_id) then
    raise exception 'Card sale created a cash movement';
  end if;

  v_sale := public.create_pos_sale(
    v_user, null, 'efectivo', v_price + 5,
    jsonb_build_array(jsonb_build_object('inventory_id', v_inventory, 'quantity', 1))
  );
  v_sale_id := (v_sale->>'id')::uuid;
  if (v_sale->>'monto_total')::numeric <> v_price or (v_sale->>'cambio')::numeric <> 5 then
    raise exception 'Incorrect cash sale';
  end if;
  select count(*) into v_count from public.cash_movements
  where reference_id = v_sale_id and cash_register_id = v_register and amount = v_price;
  if v_count <> 1 then raise exception 'Incorrect cash movement'; end if;

  begin
    perform public.create_pos_sale(
      v_user, null, 'tarjeta', 0,
      jsonb_build_array(jsonb_build_object('inventory_id', v_inventory, 'quantity', v_before))
    );
    raise exception 'Expected insufficient stock';
  exception when raise_exception then
    if sqlerrm <> 'INSUFFICIENT_STOCK' then raise; end if;
  end;
  if (select quantity_on_hand from public.inventory where id = v_inventory) <> v_before - 3 then
    raise exception 'Rejected sale changed stock';
  end if;

  update public.products set is_active = false where id = v_product;
  begin
    perform public.create_pos_sale(
      v_user, null, 'tarjeta', 0,
      jsonb_build_array(jsonb_build_object('inventory_id', v_inventory, 'quantity', 1))
    );
    raise exception 'Expected unavailable product';
  exception when raise_exception then
    if sqlerrm <> 'PRODUCT_NOT_AVAILABLE' then raise; end if;
  end;

  if has_function_privilege('authenticated', 'public.create_pos_sale(uuid,uuid,text,numeric,jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.create_pos_sale(uuid,uuid,text,numeric,jsonb)', 'execute') then
    raise exception 'Incorrect checkout permissions';
  end if;
end;
$$;
