import { z } from 'zod';

const nonnegativeInteger = z.number().int().safe().nonnegative();

export const lowStockSchema = z.object({
  total: nonnegativeInteger,
  not_evaluated: nonnegativeInteger,
  items: z.array(z.object({
    id: z.string().uuid(),
    product_code: z.string(),
    name: z.string(),
    quantity_on_hand: nonnegativeInteger,
    reorder_level: nonnegativeInteger,
  }).strict()).max(5),
}).strict().refine((value) =>
  value.items.length === Math.min(value.total, 5) &&
  value.items.every((item) => item.quantity_on_hand <= item.reorder_level)
);

export type LowStockSummary = z.infer<typeof lowStockSchema>;
