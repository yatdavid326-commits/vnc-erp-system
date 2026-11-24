import { supabaseAdmin } from '@/lib/db/supabase';
import { sanitizeAuditValues } from './auditSanitize';

export interface AuditEventInput {
  action: string;
  tableName: string;
  recordId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function writeAuditEvent(
  actorId: string,
  event: AuditEventInput
) {
  if (!supabaseAdmin) throw new Error('Admin client not available');
  const { data, error } = await supabaseAdmin.rpc('write_audit_log', {
    p_user_id: actorId,
    p_action: event.action,
    p_table_name: event.tableName,
    p_record_id: event.recordId ?? null,
    p_old_values: sanitizeAuditValues(event.oldValues),
    p_new_values: sanitizeAuditValues(event.newValues),
    p_ip_address: event.ipAddress ?? null,
  });
  if (error) throw error;
  return data;
}
