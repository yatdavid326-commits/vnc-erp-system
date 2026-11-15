import { NextResponse } from 'next/server';
import { z } from 'zod';
import { partialReceiptSchema } from '@/lib/purchases';
import { authorizeModule } from '@/lib/services/modules/authorization';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const purchaseAuth = await authorizeModule(request, 'purchases', 'can_edit');
  if (purchaseAuth.error) return purchaseAuth.error;
  const inventoryAuth = await authorizeModule(request, 'inventory', 'can_edit');
  if (inventoryAuth.error) return inventoryAuth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 });
  }
  const input = partialReceiptSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: 'Revisa la fecha y las cantidades de recepción.' }, { status: 400 });
  const { data, error } = await purchaseAuth.client.rpc('receive_partial_purchase_order', {
    p_order_id: id, p_receipt_id: input.data.id, p_date: input.data.date, p_actor: purchaseAuth.profileId, p_items: input.data.items,
  });
  if (error) {
    const messages: Record<string, string> = {
      order_missing: 'Orden no encontrada.',
      order_not_pending: 'Esta orden ya no admite recepciones. Actualiza la lista.',
      invalid_order_items: 'La orden tiene productos o cantidades inconsistentes y requiere revisión.',
      quantity_exceeded: 'La cantidad supera lo pendiente. Actualiza la lista antes de continuar.',
      receipt_conflict: 'La solicitud se utilizó con otros datos. Revisa la orden antes de continuar.',
      product_inactive: 'Un producto no existe o está inactivo.',
      stock_uninitialized: 'Inicializa las existencias de los productos recibidos mediante un ajuste de inventario.',
      invalid_stock: 'Las existencias de un producto son inconsistentes y requieren revisión.',
      stock_overflow: 'La recepción supera el máximo de existencias permitido.',
      invalid_receipt: 'Revisa los datos de recepción.',
    };
    if (error.code === 'P0001' && messages[error.message]) {
      return NextResponse.json({ error: messages[error.message] }, { status: error.message === 'order_missing' ? 404 : 409 });
    }
    if (error.code === '23505') return NextResponse.json({ error: 'La solicitud ya fue utilizada. Revisa la orden.' }, { status: 409 });
    console.error('Partial purchase receipt failed:', error);
    return NextResponse.json({ error: 'No se pudo confirmar la recepción. Revisa la orden antes de reintentar.' }, { status: 500 });
  }
  return NextResponse.json(data);
}
