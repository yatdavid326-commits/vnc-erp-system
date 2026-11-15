import { z } from 'zod';
import { reportPeriodSchema } from '@/lib/purchaseReport';

const count = z.number().int().safe().nonnegative();
const amount = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/).max(128);

export const purchaseProductReportPageSize = 25;

const productRow = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  product_code: z.string().min(1),
  order_count: count.positive(),
  line_count: count.positive(),
  quantity_ordered: count,
  quantity_received: count,
  ordered_amount_gtq: amount,
  invalid_quantity_lines: count,
  untrusted_amount_lines: count,
}).strict().refine((row) =>
  row.order_count <= row.line_count
).refine((row) =>
  row.invalid_quantity_lines <= row.line_count && row.untrusted_amount_lines <= row.line_count
).refine((row) =>
  row.quantity_received <= row.quantity_ordered
);

export const purchaseProductReportSchema = z.object({
  product_count: count,
  page: count.positive(),
  page_size: z.literal(purchaseProductReportPageSize),
  items: z.array(productRow).max(purchaseProductReportPageSize),
}).strict().refine((report) =>
  report.items.length <= report.product_count
);

export type PurchaseProductReport = z.infer<typeof purchaseProductReportSchema>;
export { reportPeriodSchema };
