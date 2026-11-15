import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeModule } from '@/lib/services/modules/authorization';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'purchases', 'can_edit');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  const { data, error } = await auth.client.rpc('cancel_pending_purchase_order', {
    p_order_id: id, p_actor: auth.profileId,
  });
  if (error) {
    const messages: Record<string, string> = {
      order_missing: 'Orden no encontrada.',
      order_not_cancellable: 'Solo se pueden anular órdenes pendientes sin recepciones. Actualiza la lista.',
      invalid_order: 'La orden tiene datos inconsistentes y requiere revisión.',
      invalid_cancellation: 'No se pudo validar la anulación.',
    };
    if (error.code === 'P0001' && messages[error.message]) {
      return NextResponse.json({ error: messages[error.message] }, { status: error.message === 'order_missing' ? 404 : 409 });
    }
    console.error('Purchase cancellation failed:', error);
    return NextResponse.json({ error: 'No se pudo confirmar la anulación. Revisa la orden antes de reintentar.' }, { status: 500 });
  }
  return NextResponse.json(data);
}
