begin;

create table public.user_notification_preferences (
  profile_id uuid primary key
    references public.user_profiles(id) on delete cascade,
  phone_e164 text,
  sms_opt_in boolean not null default false,
  sms_consented_at timestamptz,
  whatsapp_opt_in boolean not null default false,
  whatsapp_consented_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint user_notification_preferences_phone_check
    check (phone_e164 is null or phone_e164 ~ '^[+][1-9][0-9]{7,14}$'),
  constraint user_notification_preferences_sms_consent_check
    check (sms_opt_in = (sms_consented_at is not null)),
  constraint user_notification_preferences_whatsapp_consent_check
    check (whatsapp_opt_in = (whatsapp_consented_at is not null)),
  constraint user_notification_preferences_opt_in_phone_check
    check (
      (not sms_opt_in and not whatsapp_opt_in)
      or phone_e164 is not null
    )
);

alter table public.user_notification_preferences enable row level security;
revoke all on table public.user_notification_preferences
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.user_notification_preferences to service_role;

create table public.external_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  profile_id uuid not null
    references public.user_profiles(id) on delete cascade,
  channel text not null check (channel in ('sms', 'whatsapp')),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity_on_hand integer not null check (quantity_on_hand >= 0),
  reorder_level integer not null check (reorder_level >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  constraint external_notification_outbox_event_profile_channel_key
    unique (event_id, profile_id, channel)
);

create index external_notification_outbox_pending_idx
  on public.external_notification_outbox (available_at, created_at, id)
  where status = 'pending';

create index external_notification_outbox_stale_idx
  on public.external_notification_outbox (locked_at, created_at, id)
  where status = 'sending';

alter table public.external_notification_outbox enable row level security;
revoke all on table public.external_notification_outbox
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.external_notification_outbox to service_role;

create table public.inventory_low_stock_state (
  product_id uuid primary key
    references public.products(id) on delete cascade,
  is_below_threshold boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.inventory_low_stock_state enable row level security;
revoke all on table public.inventory_low_stock_state
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.inventory_low_stock_state to service_role;

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

  insert into public.external_notification_outbox (
    event_id,
    profile_id,
    channel,
    product_id,
    product_name,
    quantity_on_hand,
    reorder_level
  )
  select
    v_event_id,
    profile.id,
    channel.name,
    p_product_id,
    v_product_name,
    v_quantity,
    v_reorder_level
  from public.user_profiles as profile
  join public.user_notification_preferences as preference
    on preference.profile_id = profile.id
  cross join lateral (
    values
      ('sms'::text, preference.sms_opt_in),
      ('whatsapp'::text, preference.whatsapp_opt_in)
  ) as channel(name, is_enabled)
  where profile.is_active is true
    and profile.auth_id is not null
    and channel.is_enabled is true
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
  on conflict (event_id, profile_id, channel) do nothing;
end;
$$;

revoke all on function public.enqueue_inventory_low_stock_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_inventory_low_stock_notification(uuid)
  to service_role;

create or replace function public.notify_low_stock_from_inventory()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.enqueue_inventory_low_stock_notification(new.product_id);
  return new;
end;
$$;

revoke all on function public.notify_low_stock_from_inventory()
  from public, anon, authenticated;
grant execute on function public.notify_low_stock_from_inventory()
  to service_role;

create or replace function public.notify_low_stock_from_product()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.enqueue_inventory_low_stock_notification(new.id);
  return new;
end;
$$;

revoke all on function public.notify_low_stock_from_product()
  from public, anon, authenticated;
grant execute on function public.notify_low_stock_from_product()
  to service_role;

drop trigger if exists inventory_low_stock_after_insert
  on public.inventory;
create trigger inventory_low_stock_after_insert
  after insert on public.inventory
  for each row
  execute function public.notify_low_stock_from_inventory();

drop trigger if exists inventory_low_stock_after_quantity_update
  on public.inventory;
create trigger inventory_low_stock_after_quantity_update
  after update of quantity_on_hand on public.inventory
  for each row
  when (old.quantity_on_hand is distinct from new.quantity_on_hand)
  execute function public.notify_low_stock_from_inventory();

drop trigger if exists products_low_stock_after_insert
  on public.products;
create trigger products_low_stock_after_insert
  after insert on public.products
  for each row
  execute function public.notify_low_stock_from_product();

drop trigger if exists products_low_stock_after_threshold_update
  on public.products;
create trigger products_low_stock_after_threshold_update
  after update of name, reorder_level, is_active on public.products
  for each row
  when (
    old.name is distinct from new.name
    or old.reorder_level is distinct from new.reorder_level
    or old.is_active is distinct from new.is_active
  )
  execute function public.notify_low_stock_from_product();

create or replace function public.claim_external_notification_outbox(
  p_limit integer default 25
)
returns setof public.external_notification_outbox
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer;
begin
  v_limit := least(greatest(coalesce(p_limit, 25), 1), 50);

  update public.external_notification_outbox
  set status = 'failed',
      locked_at = null,
      last_error_code = 'delivery_timeout'
  where status = 'sending'
    and attempts >= 5
    and locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select outbox.id
    from public.external_notification_outbox as outbox
    where (
      outbox.status = 'pending'
      and outbox.available_at <= now()
    ) or (
      outbox.status = 'sending'
      and outbox.attempts < 5
      and outbox.locked_at < now() - interval '10 minutes'
    )
    order by outbox.created_at, outbox.id
    limit v_limit
    for update skip locked
  )
  update public.external_notification_outbox as outbox
  set status = 'sending',
      locked_at = now(),
      attempts = outbox.attempts + 1,
      last_error_code = null
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_external_notification_outbox(integer)
  from public, anon, authenticated;
grant execute on function public.claim_external_notification_outbox(integer)
  to service_role;

commit;
