begin;

update public.external_notification_outbox
set status = 'skipped',
    locked_at = null,
    last_error_code = 'delivery_deferred'
where status in ('pending', 'sending');

create or replace function public.enqueue_inventory_low_stock_notification(
  p_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_product_name text;
  v_quantity integer;
  v_reorder_level integer;
  v_is_active boolean;
  v_was_below_threshold boolean;
  v_is_below_threshold boolean;
  v_event_id uuid;
begin
  insert into public.inventory_low_stock_state (product_id, is_below_threshold)
  values (p_product_id, false)
  on conflict (product_id) do nothing;

  select state.is_below_threshold
  into v_was_below_threshold
  from public.inventory_low_stock_state as state
  where state.product_id = p_product_id
  for update;

  select
    product.name,
    inventory.quantity_on_hand,
    product.reorder_level,
    product.is_active
  into
    v_product_name,
    v_quantity,
    v_reorder_level,
    v_is_active
  from public.products as product
  join public.inventory as inventory on inventory.product_id = product.id
  where product.id = p_product_id;

  if not found then
    return;
  end if;

  v_quantity := coalesce(v_quantity, 0);
  v_reorder_level := greatest(coalesce(v_reorder_level, 0), 0);
  v_is_below_threshold :=
    v_is_active is true and v_quantity <= v_reorder_level;

  update public.inventory_low_stock_state
  set is_below_threshold = v_is_below_threshold,
      updated_at = now()
  where product_id = p_product_id;

  if not v_is_below_threshold or v_was_below_threshold then
    return;
  end if;

  v_event_id := gen_random_uuid();

  insert into public.notifications (
    recipient_auth_id,
    event_type,
    source_id,
    title,
    message,
    href
  )
  select
    profile.auth_id,
    'inventory_low_stock',
    v_event_id,
    'Inventario bajo',
    format(
      'Inventario bajo: %s tiene %s unidades disponibles (mínimo %s).',
      v_product_name,
      v_quantity,
      v_reorder_level
    ),
    '/dashboard/inventario'
  from public.user_profiles as profile
  where profile.is_active is true
    and profile.auth_id is not null
    and (
      profile.role = 'admin'
      or exists (
        select 1
        from public.user_modules as permission
        join public.modules as module on module.id = permission.module_id
        where permission.user_id = profile.id
          and permission.can_view is true
          and module.name = 'inventory'
          and module.is_active is true
      )
    )
  on conflict (recipient_auth_id, event_type, source_id) do nothing;
end;
$$;

revoke all on function public.enqueue_inventory_low_stock_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_inventory_low_stock_notification(uuid)
  to service_role;

commit;
