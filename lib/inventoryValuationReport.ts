import { z } from 'zod';

const count = z.number().int().safe().nonnegative();

export const inventoryValuationReportSchema = z.object({
  total_products: count,
  valued_products: count,
  not_valued_products: count,
  invalid_cost_products: count,
  inventory_cost_value_gtq: z.string().regex(/^\d+(?:\.\d+)?$/),
}).strict().refine((value) =>
  value.total_products === value.valued_products + value.not_valued_products &&
  value.invalid_cost_products <= value.not_valued_products
);

export type InventoryValuationReport = z.infer<typeof inventoryValuationReportSchema>;
