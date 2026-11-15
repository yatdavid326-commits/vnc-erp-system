import { z } from 'zod';

const item = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(2147483647),
  unit_price: z.number().finite().min(0).max(9999999999.99)
    .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value))),
}).strict();

export const purchaseSchema = z.object({
  id: z.string().uuid(),
  number: z.string().trim().min(1).max(80),
  supplier_id: z.string().uuid(),
  order_date: z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }),
  notes: z.string().trim().max(500),
  items: z.array(item).min(1).max(100),
}).strict().refine((value) => new Set(value.items.map((row) => row.product_id)).size === value.items.length);

export type PurchaseInput = z.infer<typeof purchaseSchema>;
