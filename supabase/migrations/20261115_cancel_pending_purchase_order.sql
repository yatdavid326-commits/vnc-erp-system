begin;

alter table public.purchase_orders
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.user_profiles(id);

create function public.cancel_pending_purchase_order(p_order_id uuid, p_actor uuid)
returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare
  ord public.purchase_orders%rowtype;
begin
  if p_order_id is null or p_actor is null then
    raise exception 'invalid_cancellation' using errcode = 'P0001';
  end if;

  select * into ord from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception 'order_missing' using errcode = 'P0001'; end if;
  if ord.status = 'cancelled' and ord.cancelled_at is not null and ord.cancelled_by is not null then
    return jsonb_build_object('already_cancelled', true);
  end if;
  if ord.status is distinct from 'pending' then
    raise exception 'order_not_cancellable' using errcode = 'P0001';
  end if;
  if ord.cancelled_at is not null or ord.cancelled_by is not null
    or exists (select 1 from public.purchase_receipts where order_id = p_order_id)
    or not exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id)
    or exists (select 1 from public.purchase_order_items where purchase_order_id = p_order_id
      and (quantity_ordered <= 0 or quantity_received is distinct from 0)) then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;

  update public.purchase_orders
    set status = 'cancelled', cancelled_at = now(), cancelled_by = p_actor, updated_at = now()
    where id = p_order_id;
  return jsonb_build_object('already_cancelled', false);
end $$;

revoke all on function public.cancel_pending_purchase_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_pending_purchase_order(uuid, uuid) to service_role;
commit;
