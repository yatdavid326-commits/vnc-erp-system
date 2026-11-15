begin;

alter table public.purchase_orders
  add column edit_version integer not null default 0,
  add column last_edited_by uuid references public.user_profiles(id);

create function public.edit_pending_purchase_details(
  p_order_id uuid, p_actor uuid, p_date date, p_notes text, p_version integer
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare
  ord public.purchase_orders%rowtype;
begin
  if p_order_id is null or p_actor is null or p_date is null or p_notes is null
    or length(p_notes) > 500 or p_version is null or p_version < 0 then
    raise exception 'invalid_details' using errcode = 'P0001';
  end if;
  select * into ord from public.purchase_orders where id = p_order_id for update;
  if not found then raise exception 'order_missing' using errcode = 'P0001'; end if;
  if ord.status is distinct from 'pending' then
    raise exception 'order_not_editable' using errcode = 'P0001';
  end if;
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

revoke all on function public.edit_pending_purchase_details(uuid, uuid, date, text, integer) from public, anon, authenticated;
grant execute on function public.edit_pending_purchase_details(uuid, uuid, date, text, integer) to service_role;
commit;
