import { z } from 'zod';

const count = z.number().int().safe().nonnegative();
const amount = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/);

export const purchaseSupplierReportPageSize = 25;

const supplierRow = z.object({
  supplier_id: z.string().uuid().nullable(),
  supplier_name: z.string().min(1).max(200),
  total_orders: count.positive(),
  total_amount_gtq: amount,
  unvalued_amount_orders: count,
}).strict().refine((row) => row.unvalued_amount_orders <= row.total_orders);

export const purchaseSupplierReportSchema = z.object({
  supplier_count: count,
  page: count.positive(),
  page_size: z.literal(purchaseSupplierReportPageSize),
  items: z.array(supplierRow).max(purchaseSupplierReportPageSize),
}).strict().refine((report) =>
  report.items.length <= report.supplier_count
).refine((report) =>
  report.items.length <= report.page_size
);

export type PurchaseSupplierReport = z.infer<typeof purchaseSupplierReportSchema>;
