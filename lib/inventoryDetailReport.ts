import { z } from 'zod';

const nullableInteger = z.number().int().safe().nullable();

export const inventoryDetailRowSchema = z.object({
  id: z.string().uuid(),
  product_code: z.string(),
  name: z.string(),
  unit_of_measure: z.string().nullable(),
  cost_price: z.string(),
  selling_price: z.string(),
  reorder_level: nullableInteger,
  quantity_on_hand: nullableInteger,
  quantity_reserved: nullableInteger,
  stock_status: z.enum(['unregistered', 'invalid', 'zero', 'positive']),
}).strict();

export const inventoryDetailPageSchema = z.array(inventoryDetailRowSchema);

export type InventoryDetailRow = z.infer<typeof inventoryDetailRowSchema>;

export const inventoryDetailCsvHeader = [
  'Código',
  'Nombre',
  'Unidad',
  'Costo',
  'Precio de venta',
  'Existencia física',
  'Cantidad reservada',
  'Nivel de reposición',
  'Estado',
] as const;

const statusLabels = {
  unregistered: 'Sin registrar',
  invalid: 'Inválido',
  zero: 'Sin existencia',
  positive: 'Con existencia',
} as const;

export function inventoryDetailCsvRow(row: InventoryDetailRow): readonly (string | number)[] {
  return [
    row.product_code,
    row.name,
    row.unit_of_measure ?? '',
    row.cost_price,
    row.selling_price,
    row.quantity_on_hand ?? '',
    row.quantity_reserved ?? '',
    row.reorder_level ?? '',
    statusLabels[row.stock_status],
  ];
}
