begin;

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public'
    and tablename in ('compras', 'purchase_orders', 'purchase_order_items')) then
    raise exception 'Review existing purchase policies before applying this migration';
  end if;
end $$;

alter table public.compras enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
revoke all on table public.compras, public.purchase_orders, public.purchase_order_items
  from public, anon, authenticated;

create function public.create_purchase_order(
  p_id uuid, p_number text, p_supplier uuid, p_date date, p_notes text,
  p_items jsonb, p_actor uuid
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare
  existing public.purchase_orders%rowtype;
  item jsonb;
  product uuid;
  qty integer;
  price numeric;
  total numeric := 0;
  supplier_active boolean;
begin
  if p_id is null or p_supplier is null or p_date is null or p_actor is null
    or p_number is null or length(trim(p_number)) = 0 or length(p_number) > 80
    or p_notes is null or length(p_notes) > 500 or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'invalid_purchase' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into existing from public.purchase_orders where id = p_id;
  if found then
    if existing.po_number = p_number and existing.supplier_id = p_supplier
      and existing.order_date = p_date and existing.notes = p_notes and existing.created_by = p_actor
      and (select count(*) from public.purchase_order_items where purchase_order_id = p_id) = jsonb_array_length(p_items)
      and not exists (
        select 1 from jsonb_array_elements(p_items) x
        where not exists (select 1 from public.purchase_order_items i
          where i.purchase_order_id = p_id and i.product_id = (x->>'product_id')::uuid
            and i.quantity_ordered = (x->>'quantity')::integer and i.unit_price = (x->>'unit_price')::numeric)
      ) then
      return jsonb_build_object('already_recorded', true);
    end if;
    raise exception 'purchase_conflict' using errcode = 'P0001';
  end if;

  select is_active into supplier_active from public.suppliers where id = p_supplier for share;
  if supplier_active is not true then raise exception 'supplier_inactive' using errcode = 'P0001'; end if;
  if (select count(distinct x->>'product_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then
    raise exception 'duplicate_product' using errcode = 'P0001';
  end if;
  for item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    product := (item->>'product_id')::uuid;
    qty := (item->>'quantity')::integer;
    price := (item->>'unit_price')::numeric;
    if product is null or qty is null or qty <= 0 or price is null or price < 0
      or price > 9999999999.99 or price <> round(price, 2) then
      raise exception 'invalid_purchase' using errcode = 'P0001';
    end if;
    perform 1 from public.products where id = product and is_active is true for share;
    if not found then raise exception 'product_inactive' using errcode = 'P0001'; end if;
    total := total + qty * price;
    if total > 9999999999.99 then raise exception 'total_overflow' using errcode = 'P0001'; end if;
  end loop;
  insert into public.purchase_orders (id, po_number, supplier_id, order_date, status, total_amount, notes, created_by)
    values (p_id, p_number, p_supplier, p_date, 'pending', total, p_notes, p_actor);
  for item in select value from jsonb_array_elements(p_items) loop
    qty := (item->>'quantity')::integer;
    price := (item->>'unit_price')::numeric;
    insert into public.purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price, line_total)
      values (p_id, (item->>'product_id')::uuid, qty, price, qty * price);
  end loop;
  return jsonb_build_object('already_recorded', false);
end $$;

revoke all on function public.create_purchase_order(uuid, text, uuid, date, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_purchase_order(uuid, text, uuid, date, text, jsonb, uuid)
  to service_role;
commit;
