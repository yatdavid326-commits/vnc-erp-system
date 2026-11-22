begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_auth_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (length(btrim(event_type)) between 1 and 80),
  source_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 120),
  message text not null check (length(btrim(message)) between 1 and 300),
  href text not null check (href = '/' or href ~ '^/[^/]'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_event_recipient_source_key
    unique (recipient_auth_id, event_type, source_id)
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_auth_id, created_at desc, id desc);

alter table public.notifications enable row level security;
revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (recipient_auth_id = auth.uid());

create policy notifications_update_read_own
  on public.notifications
  for update
  to authenticated
  using (recipient_auth_id = auth.uid())
  with check (recipient_auth_id = auth.uid());

create or replace function public.notify_pos_sale()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (
    recipient_auth_id,
    event_type,
    source_id,
    title,
    message,
    href
  )
  select distinct
    profile.auth_id,
    'pos_sale_created',
    new.id,
    'Nueva venta',
    'Se registró una nueva venta en POS.',
    '/dashboard/pos'
  from public.user_profiles as profile
  join public.user_modules as permission
    on permission.user_id = profile.id
    and permission.can_view = true
  join public.modules as module
    on module.id = permission.module_id
    and module.name = 'pos'
    and module.is_active = true
  where profile.is_active = true
    and profile.auth_id is not null
  on conflict (recipient_auth_id, event_type, source_id) do nothing;

  return new;
end;
$$;

revoke all on function public.notify_pos_sale() from public, anon, authenticated;

create trigger notify_pos_sale_after_insert
  after insert on public.pos_transacciones
  for each row
  execute function public.notify_pos_sale();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

commit;
