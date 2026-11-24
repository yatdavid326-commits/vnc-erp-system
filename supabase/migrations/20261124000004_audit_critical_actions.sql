begin;

create or replace function public.write_audit_log(
  p_user_id uuid,
  p_action text,
  p_table_name text,
  p_record_id uuid,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_ip_address inet default null
) returns public.audit_logs language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.audit_logs;
begin
  insert into public.audit_logs (
    user_id, action, table_name, record_id,
    old_values, new_values, ip_address
  ) values (
    p_user_id, left(p_action, 200), p_table_name,
    p_record_id, p_old_values, p_new_values, p_ip_address
  ) returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.write_audit_log(uuid,text,text,uuid,jsonb,jsonb,inet)
  from public, anon, authenticated;
grant execute on function public.write_audit_log(uuid,text,text,uuid,jsonb,jsonb,inet)
  to service_role;

commit;
