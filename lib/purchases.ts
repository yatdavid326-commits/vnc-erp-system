import { z } from 'zod';

const date = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'La fecha no es válida.');

const quantity = z.number().int().positive().max(2147483647);

export const purchaseCreateSchema = z.object({
  id: z.string().uuid(),
  numero_po: z.string().trim().min(1).max(80),
  proveedor_id: z.string().uuid(),
  fecha_orden: date,
  notes: z.string().trim().max(500),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity,
    unit_price: z.number().finite().min(0).max(9999999999.99)
      .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value))),
  }).strict()).min(1).max(100),
}).strict().refine((value) => new Set(value.items.map((item) => item.product_id)).size === value.items.length, {
  message: 'Un producto no puede aparecer más de una vez.',
});

export const purchaseReceiptSchema = z.object({
  id: z.string().uuid(),
  date,
  items: z.array(z.object({
    item_id: z.string().uuid(),
    quantity,
  }).strict()).min(1).max(100),
}).strict().refine((value) => new Set(value.items.map((item) => item.item_id)).size === value.items.length, {
  message: 'Una partida no puede aparecer más de una vez.',
});

export const purchaseDetailsSchema = z.object({
  fecha_orden: date,
  notes: z.string().trim().max(500),
  edit_version: z.number().int().min(0).max(2147483647),
}).strict();

export function purchaseStatusLabel(status: string | null): string {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'partially_received': return 'Parcialmente recibida';
    case 'received': return 'Recibida';
    case 'cancelled': return 'Anulada';
    default: return status ?? 'Sin estado';
  }
}

export type PurchaseInput = z.infer<typeof purchaseCreateSchema>;
export type PurchaseReceiptInput = z.infer<typeof purchaseReceiptSchema>;
export type PurchaseDetailsInput = z.infer<typeof purchaseDetailsSchema>;
