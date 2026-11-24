begin;

create table public.signin_attempts (
  client_key text not null,
  attempted_at timestamptz not null default clock_timestamp()
);

create index signin_attempts_client_time_idx
  on public.signin_attempts (client_key, attempted_at);
create index signin_attempts_time_idx
  on public.signin_attempts (attempted_at);

alter table public.signin_attempts enable row level security;
revoke all on table public.signin_attempts from public, anon, authenticated;
grant select, insert, delete on table public.signin_attempts to service_role;
grant update (attempted_at) on table public.signin_attempts to service_role;

create function public.consume_signin_attempt(p_client_key text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_count integer;
  v_oldest timestamptz;
begin
  if p_client_key is null or p_client_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_signin_client_key' using errcode = 'P0001';
  end if;

  delete from public.signin_attempts
  where ctid in (
    select ctid from public.signin_attempts
    where attempted_at <= clock_timestamp() - interval '15 minutes'
    order by attempted_at
    limit 100
    for update skip locked
  );

  perform pg_advisory_xact_lock(hashtextextended(p_client_key, 0));
  v_now := clock_timestamp();
  select count(*), min(attempted_at)
    into v_count, v_oldest
  from public.signin_attempts
  where client_key = p_client_key
    and attempted_at > v_now - interval '15 minutes';

  if v_count >= 20 then
    return jsonb_build_object(
      'allowed', false,
      'retry_after', greatest(1, ceil(extract(epoch from v_oldest + interval '15 minutes' - v_now))::integer)
    );
  end if;

  insert into public.signin_attempts (client_key, attempted_at)
  values (p_client_key, v_now);
  return jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$$;

revoke all on function public.consume_signin_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_signin_attempt(text) to service_role;

commit;
