import { z } from 'zod';

const money = z.number().finite().min(0).max(9999999999.99)
  .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)));

export const productSchema = z.object({
  product_code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000),
  unit_of_measure: z.string().trim().min(1).max(50),
  cost_price: money,
  selling_price: money,
  reorder_level: z.number().int().min(0).max(2147483647),
  is_active: z.boolean(),
}).strict();

export type ProductInput = z.infer<typeof productSchema>;

export interface Product {
  id: string;
  product_code: string;
  name: string;
  description: string | null;
  unit_of_measure: string | null;
  cost_price: number;
  selling_price: number;
  reorder_level: number | null;
  is_active: boolean | null;
  inventory: { quantity_on_hand: number | null; quantity_reserved: number | null } | null;
}

export const emptyProduct = {
  product_code: '',
  name: '',
  description: '',
  unit_of_measure: 'unidad',
  cost_price: '',
  selling_price: '',
  reorder_level: '10',
  is_active: true,
};
