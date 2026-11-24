begin;

create or replace function public.create_pos_sale(
  p_user_id uuid,
  p_customer_id uuid,
  p_payment_method text,
  p_amount_paid numeric,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_register public.cash_register%rowtype;
  v_transaction public.pos_transacciones%rowtype;
  v_item record;
  v_locked_products uuid[] := '{}';
  v_requested_count integer;
  v_unique_count integer;
  v_processed_count integer := 0;
  v_subtotal numeric := 0;
  v_total numeric;
  v_amount_paid numeric;
  v_change numeric;
  v_transaction_number text;
begin
  if not exists (
    select 1 from public.user_profiles
    where id = p_user_id and is_active = true
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_USER';
  end if;

  if p_payment_method is null
    or p_payment_method not in ('efectivo', 'tarjeta', 'cheque') then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_METHOD';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_ITEMS';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_ITEMS';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as requested(inventory_id uuid, quantity integer)
    where requested.inventory_id is null
      or requested.quantity is null
      or requested.quantity <= 0
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_ITEMS';
  end if;

  select count(*), count(distinct requested.inventory_id)
    into v_requested_count, v_unique_count
  from jsonb_to_recordset(p_items) as requested(inventory_id uuid, quantity integer);

  if v_requested_count <> v_unique_count then
    raise exception using errcode = 'P0001', message = 'DUPLICATE_ITEMS';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers
    where id = p_customer_id and is_active = true
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_CUSTOMER';
  end if;

  select register.*
    into v_register
  from public.cash_register as register
  where register.cashier_id = p_user_id
    and register.status = 'open'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'NO_OPEN_REGISTER';
  end if;

  -- Match manual inventory movements: lock products before inventory, in a stable order.
  for v_item in
    select product.id
    from jsonb_to_recordset(p_items) as requested(inventory_id uuid, quantity integer)
    join public.inventory as inventory on inventory.id = requested.inventory_id
    join public.products as product on product.id = inventory.product_id
    order by product.id
    for update of product
  loop
    v_locked_products := array_append(v_locked_products, v_item.id);
  end loop;

  for v_item in
    select
      requested.inventory_id,
      requested.quantity,
      inventory.product_id,
      inventory.quantity_on_hand,
      inventory.quantity_reserved,
      product.selling_price
    from jsonb_to_recordset(p_items) as requested(inventory_id uuid, quantity integer)
    join public.inventory as inventory on inventory.id = requested.inventory_id
    join public.products as product
      on product.id = inventory.product_id
      and product.is_active = true
    order by inventory.id
    for update of inventory
  loop
    v_processed_count := v_processed_count + 1;

    if not (v_item.product_id = any(v_locked_products)) then
      raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_AVAILABLE';
    end if;

    if v_item.selling_price < 0 then
      raise exception using errcode = 'P0001', message = 'INVALID_PRODUCT_PRICE';
    end if;

    if v_item.quantity > (
      coalesce(v_item.quantity_on_hand, 0) - coalesce(v_item.quantity_reserved, 0)
    ) then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
    end if;

    v_subtotal := v_subtotal + (v_item.selling_price * v_item.quantity);
  end loop;

  if v_processed_count <> v_requested_count then
    raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_AVAILABLE';
  end if;

  v_total := round(v_subtotal, 2);

  if p_payment_method = 'efectivo' then
    if p_amount_paid is null or p_amount_paid < v_total then
      raise exception using errcode = 'P0001', message = 'PAYMENT_TOO_LOW';
    end if;
    v_amount_paid := p_amount_paid;
    v_change := round(p_amount_paid - v_total, 2);
  else
    v_amount_paid := v_total;
    v_change := 0;
  end if;

  v_transaction_number := format(
    'V-%s-%s',
    to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
    upper(left(replace(gen_random_uuid()::text, '-', ''), 8))
  );

  insert into public.pos_transacciones (
    numero_transaccion,
    usuario_id,
    cliente_id,
    monto_total,
    monto_pagado,
    cambio,
    metodo_pago,
    estado,
    cash_register_id
  )
  values (
    v_transaction_number,
    p_user_id,
    p_customer_id,
    v_total,
    v_amount_paid,
    v_change,
    p_payment_method,
    'completada',
    v_register.id
  )
  returning * into v_transaction;

  for v_item in
    select
      requested.inventory_id,
      requested.quantity,
      inventory.product_id,
      product.selling_price
    from jsonb_to_recordset(p_items) as requested(inventory_id uuid, quantity integer)
    join public.inventory as inventory on inventory.id = requested.inventory_id
    join public.products as product
      on product.id = inventory.product_id
      and product.is_active = true
    order by inventory.id
  loop
    insert into public.pos_items (
      transaction_id,
      product_id,
      quantity,
      unit_price,
      subtotal
    )
    values (
      v_transaction.id,
      v_item.inventory_id,
      v_item.quantity,
      v_item.selling_price,
      round(v_item.selling_price * v_item.quantity, 2)
    );

    update public.inventory
    set quantity_on_hand = coalesce(quantity_on_hand, 0) - v_item.quantity,
        last_updated = now()
    where id = v_item.inventory_id;

    insert into public.inventory_movements (
      product_id,
      movement_type,
      quantity,
      reference_id,
      reference_type,
      notes,
      created_by
    )
    values (
      v_item.product_id,
      'salida',
      v_item.quantity,
      v_transaction.id,
      'venta',
      'Venta ' || v_transaction_number,
      p_user_id
    );
  end loop;

  if p_payment_method = 'efectivo' then
    insert into public.cash_movements (
      cash_register_id,
      movement_type,
      amount,
      reference_id,
      description,
      created_by
    )
    values (
      v_register.id,
      'ingreso',
      v_total,
      v_transaction.id,
      'Venta ' || v_transaction_number || ' - efectivo',
      p_user_id
    );
  end if;

  return jsonb_build_object(
    'id', v_transaction.id,
    'numero_transaccion', v_transaction.numero_transaccion,
    'usuario_id', v_transaction.usuario_id,
    'cliente_id', v_transaction.cliente_id,
    'monto_total', v_transaction.monto_total,
    'monto_pagado', v_transaction.monto_pagado,
    'cambio', v_transaction.cambio,
    'metodo_pago', v_transaction.metodo_pago,
    'estado', v_transaction.estado,
    'cash_register_id', v_transaction.cash_register_id,
    'created_at', v_transaction.created_at
  );
end;
$$;

revoke all on function public.create_pos_sale(uuid, uuid, text, numeric, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_pos_sale(uuid, uuid, text, numeric, jsonb)
  to service_role;

commit;
