import { z } from 'zod';

const count = z.number().int().safe().nonnegative();
export const inventoryReportSchema = z.object({
  total: count,
  positive: count,
  zero: count,
  unregistered: count,
  invalid: count,
}).strict().refine((value) =>
  value.total === value.positive + value.zero + value.unregistered + value.invalid
);

export type InventoryReport = z.infer<typeof inventoryReportSchema>;
