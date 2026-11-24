begin;

do $$
declare
  actor uuid;
  supplier uuid := gen_random_uuid();
  product uuid := gen_random_uuid();
  order_id uuid := gen_random_uuid();
  cancel_id uuid := gen_random_uuid();
  line_id uuid;
  receipt_id uuid := gen_random_uuid();
  items jsonb;
  receipt_items jsonb;
  result jsonb;
  stock integer;
  starting_total numeric;
begin
  if has_function_privilege('anon', 'public.receive_partial_purchase_order(uuid,uuid,date,uuid,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.receive_partial_purchase_order(uuid,uuid,date,uuid,jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.receive_partial_purchase_order(uuid,uuid,date,uuid,jsonb)', 'execute') then
    raise exception 'receipt function privileges incorrect';
  end if;
  if to_regprocedure('public.receive_purchase_order(uuid,uuid,date,uuid)') is not null
    and has_function_privilege('service_role', 'public.receive_purchase_order(uuid,uuid,date,uuid)', 'execute') then
    raise exception 'legacy receipt function remains executable';
  end if;
  select id into actor from public.user_profiles where is_active is true order by id limit 1;
  if actor is null then raise exception 'test requires an active profile'; end if;
  starting_total := public.get_purchase_total();
  insert into public.suppliers (id, name, is_active) values (supplier, 'VNC purchase rollback test', true);
  insert into public.products (id, product_code, name, cost_price, selling_price, reorder_level, is_active)
    values (product, 'VNC-PURCHASE-TEST-' || product, 'VNC purchase rollback test', 1, 2, 0, true);
  items := jsonb_build_array(jsonb_build_object('product_id', product, 'quantity', 5, 'unit_price', 1.25));
  result := public.create_purchase_order(order_id, 'VNC-PURCHASE-TEST-' || order_id, supplier, current_date, '', items, actor);
  if (result->>'already_recorded')::boolean then raise exception 'first order was a retry'; end if;
  result := public.create_purchase_order(order_id, 'VNC-PURCHASE-TEST-' || order_id, supplier, current_date, '', items, actor);
  if not (result->>'already_recorded')::boolean then raise exception 'order retry was not idempotent'; end if;
  if (select count(*) from public.purchase_order_items where purchase_order_id = order_id) <> 1
    or (select total_amount from public.purchase_orders where id = order_id) <> 6.25
    or public.get_purchase_total() <> starting_total + 6.25 then
    raise exception 'order items or total incorrect';
  end if;
  select quantity_on_hand into stock from public.inventory where product_id = product;
  if stock <> 0 then raise exception 'creating order changed stock'; end if;
  result := public.edit_pending_purchase_details(order_id, actor, current_date, 'updated', 0);
  if (result->>'edit_version')::integer <> 1 then raise exception 'edit version incorrect'; end if;
  begin
    perform public.edit_pending_purchase_details(order_id, actor, current_date, '', 0);
    raise exception 'stale edit accepted';
  exception when raise_exception then
    if sqlerrm <> 'order_changed' then raise; end if;
  end;
  select id into line_id from public.purchase_order_items where purchase_order_id = order_id;
  receipt_items := jsonb_build_array(jsonb_build_object('item_id', line_id, 'quantity', 2));
  result := public.receive_partial_purchase_order(order_id, receipt_id, current_date, actor, receipt_items);
  if (result->>'already_recorded')::boolean or (result->>'complete')::boolean then raise exception 'partial receipt incorrect'; end if;
  result := public.receive_partial_purchase_order(order_id, receipt_id, current_date, actor, receipt_items);
  if not (result->>'already_recorded')::boolean then raise exception 'receipt retry was not idempotent'; end if;
  if (select quantity_on_hand from public.inventory where product_id = product) <> 2
    or (select status from public.purchase_orders where id = order_id) <> 'partially_received'
    or (select count(*) from public.inventory_movements where product_id = product) <> 1 then
    raise exception 'partial receipt stock or state incorrect';
  end if;
  begin
    perform public.receive_partial_purchase_order(order_id, gen_random_uuid(), current_date, actor,
      jsonb_build_array(jsonb_build_object('item_id', line_id, 'quantity', 4)));
    raise exception 'excess receipt accepted';
  exception when raise_exception then
    if sqlerrm <> 'quantity_exceeded' then raise; end if;
  end;
  if (select quantity_on_hand from public.inventory where product_id = product) <> 2 then
    raise exception 'rejected receipt changed stock';
  end if;
  result := public.receive_partial_purchase_order(order_id, gen_random_uuid(), current_date, actor,
    jsonb_build_array(jsonb_build_object('item_id', line_id, 'quantity', 3)));
  if not (result->>'complete')::boolean
    or (select quantity_on_hand from public.inventory where product_id = product) <> 5
    or (select status from public.purchase_orders where id = order_id) <> 'received'
    or (select count(*) from public.inventory_movements where product_id = product) <> 2 then
    raise exception 'complete receipt stock or state incorrect';
  end if;
  begin
    perform public.cancel_pending_purchase_order(order_id, actor);
    raise exception 'received order cancelled';
  exception when raise_exception then
    if sqlerrm <> 'order_not_cancellable' then raise; end if;
  end;
  perform public.create_purchase_order(cancel_id, 'VNC-PURCHASE-TEST-' || cancel_id, supplier, current_date, '', items, actor);
  perform public.cancel_pending_purchase_order(cancel_id, actor);
  result := public.cancel_pending_purchase_order(cancel_id, actor);
  if not (result->>'already_cancelled')::boolean then raise exception 'cancellation retry failed'; end if;
  begin
    insert into public.compras (numero_po, proveedor_id, fecha_orden) values ('VNC-TEST-' || order_id, supplier, current_date);
    raise exception 'legacy purchase write allowed';
  exception when raise_exception then
    if sqlerrm <> 'legacy_purchase_model_disabled' then raise; end if;
  end;
end $$;

rollback;
