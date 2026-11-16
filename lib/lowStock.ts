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

export const lowStockProductsPageSize = 25;

export const lowStockProductsReportSchema = z.object({
  total: nonnegativeInteger,
  not_evaluated: nonnegativeInteger,
  page: nonnegativeInteger.positive(),
  page_size: z.literal(lowStockProductsPageSize),
  items: z.array(z.object({
    id: z.string().uuid(),
    product_code: z.string(),
    name: z.string(),
    quantity_on_hand: nonnegativeInteger,
    reorder_level: nonnegativeInteger,
  }).strict()).max(lowStockProductsPageSize).refine((items) =>
    items.every((item) => item.quantity_on_hand <= item.reorder_level)
  ),
}).strict().refine((value) =>
  value.items.length <= Math.min(value.total, value.page_size)
);

export type LowStockProductRow = {
  id: string;
  product_code: string;
  name: string;
  reorder_level: number | string | null;
};
export type LowStockInventoryRow = { product_id: string; quantity_on_hand: number | string | null };

function stockNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Mismas reglas que dashboard_low_stock: solo productos activos; compara la existencia
 * física con el nivel de reposición sin descontar reservas; existencias o niveles
 * faltantes o negativos se cuentan como no evaluados.
 */
export function buildLowStockProductsReport(
  activeProducts: LowStockProductRow[],
  inventory: LowStockInventoryRow[],
  page: number,
  pageSize = lowStockProductsPageSize,
) {
  const stockByProduct = new Map(inventory.map((row) => [row.product_id, stockNumber(row.quantity_on_hand)]));
  let notEvaluated = 0;
  const lowStock: { id: string; product_code: string; name: string; quantity_on_hand: number; reorder_level: number }[] = [];
  for (const product of activeProducts) {
    const quantity = stockByProduct.get(product.id) ?? null;
    const reorderLevel = stockNumber(product.reorder_level);
    if (quantity === null || quantity < 0 || reorderLevel === null || reorderLevel < 0) {
      notEvaluated += 1;
    } else if (quantity <= reorderLevel) {
      lowStock.push({
        id: product.id, product_code: product.product_code, name: product.name,
        quantity_on_hand: quantity, reorder_level: reorderLevel,
      });
    }
  }
  lowStock.sort((a, b) => a.quantity_on_hand - b.quantity_on_hand
    || compareText(a.product_code, b.product_code) || compareText(a.id, b.id));
  return {
    total: lowStock.length,
    not_evaluated: notEvaluated,
    page,
    page_size: pageSize,
    items: lowStock.slice((page - 1) * pageSize, page * pageSize),
  };
}

export type LowStockSummary = z.infer<typeof lowStockSchema>;
export type LowStockProductsReport = z.infer<typeof lowStockProductsReportSchema>;
