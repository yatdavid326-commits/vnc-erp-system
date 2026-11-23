import { supabaseAdmin } from '@/lib/db/supabase';
import {
  dashboardSummarySchema,
  type DashboardSummary,
} from '@/lib/validation/dashboardSummary';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.');
  }

  const { data, error } = await supabaseAdmin.rpc('get_dashboard_summary');
  if (error) throw error;

  const result = dashboardSummarySchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid dashboard summary response: ${result.error.message}`
    );
  }

  return result.data;
}
