begin;

grant select on table public.notifications to service_role;
grant update (read_at) on table public.notifications to service_role;

commit;
