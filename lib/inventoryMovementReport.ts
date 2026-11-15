import { z } from 'zod';
import { reportPeriodSchema } from '@/lib/purchaseReport';

const count = z.number().int().safe().nonnegative();

export const inventoryMovementReportPageSize = 25;

const movement = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  movement_type: z.string().min(1).max(100),
  quantity: z.number().int().safe(),
  reference_type: z.string().nullable(),
  reference_id: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  actor_name: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
}).strict();

export const inventoryMovementReportSchema = z.object({
  total_count: count,
  page: count.positive(),
  page_size: z.literal(inventoryMovementReportPageSize),
  items: z.array(movement).max(inventoryMovementReportPageSize),
}).strict().refine((report) =>
  report.items.length <= report.total_count
);

export type InventoryMovementReport = z.infer<typeof inventoryMovementReportSchema>;
export type InventoryMovementReportItem = z.infer<typeof movement>;
export { reportPeriodSchema };
