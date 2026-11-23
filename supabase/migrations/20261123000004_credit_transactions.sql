begin;

create table public.credit_transactions (
  id uuid primary key,
  cliente_id uuid not null references public.customers(id) on delete restrict,
  monto numeric(12,2) not null,
  tipo text not null check (tipo in ('compra', 'pago', 'ajuste')),
  descripcion text,
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.user_profiles(id),
  check (monto <> 0 and (tipo = 'ajuste' or monto > 0))
);

create index credit_transactions_customer_date_idx
  on public.credit_transactions (cliente_id, fecha desc, created_at desc);

alter table public.credit_transactions enable row level security;
revoke all on public.credit_transactions from public, anon, authenticated, service_role;
grant select on public.credit_transactions to service_role;

create function public.create_credit_transaction(
  p_id uuid, p_cliente_id uuid, p_monto numeric, p_tipo text,
  p_descripcion text, p_fecha timestamptz, p_created_by uuid
)
returns public.credit_transactions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer public.customers%rowtype;
  v_transaction public.credit_transactions%rowtype;
  v_balance numeric;
begin
  if p_id is null or p_cliente_id is null or p_created_by is null
    or p_monto is null or p_monto = 0 or abs(p_monto) > 9999999999.99
    or p_monto <> round(p_monto, 2)
    or p_tipo is null or p_tipo not in ('compra', 'pago', 'ajuste')
    or (p_tipo in ('compra', 'pago') and p_monto < 0)
    or p_fecha is null or length(p_descripcion) > 1000 then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSACTION';
  end if;

  select * into v_customer from public.customers where id = p_cliente_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'CUSTOMER_NOT_FOUND';
  end if;

  select * into v_transaction from public.credit_transactions where id = p_id;
  if found then
    if v_transaction.cliente_id <> p_cliente_id or v_transaction.monto <> p_monto
      or v_transaction.tipo <> p_tipo or v_transaction.descripcion is distinct from p_descripcion
      or v_transaction.fecha <> p_fecha or v_transaction.created_by <> p_created_by then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return v_transaction;
  end if;

  v_balance := coalesce(v_customer.current_balance, 0) +
    case when p_tipo = 'pago' then -p_monto else p_monto end;
  if v_balance < 0 then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_BALANCE';
  end if;
  if p_tipo = 'compra' and v_balance > coalesce(v_customer.credit_limit, 0) then
    raise exception using errcode = 'P0001', message = 'CREDIT_LIMIT_EXCEEDED';
  end if;
  if v_balance > 9999999999.99 then
    raise exception using errcode = 'P0001', message = 'BALANCE_TOO_LARGE';
  end if;

  insert into public.credit_transactions (id, cliente_id, monto, tipo, descripcion, fecha, created_by)
  values (p_id, p_cliente_id, p_monto, p_tipo, p_descripcion, p_fecha, p_created_by)
  returning * into v_transaction;
  update public.customers set current_balance = v_balance where id = p_cliente_id;
  return v_transaction;
end;
$$;

revoke all on function public.create_credit_transaction(uuid, uuid, numeric, text, text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.create_credit_transaction(uuid, uuid, numeric, text, text, timestamptz, uuid)
  to service_role;

commit;
