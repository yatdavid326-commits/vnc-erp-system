import { NextResponse } from 'next/server';
import { z } from 'zod';
import { purchaseDetailsSchema } from '@/lib/purchases';
import { authorizeModule } from '@/lib/services/modules/authorization';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'purchases', 'can_edit');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 });
  }
  const input = purchaseDetailsSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: 'Revisa la fecha y las notas.' }, { status: 400 });
  const { data, error } = await auth.client.rpc('edit_pending_purchase_details', {
    p_order_id: id, p_actor: auth.profileId, p_date: input.data.order_date,
    p_notes: input.data.notes, p_version: input.data.edit_version,
  });
  if (error) {
    const messages: Record<string, string> = {
      order_missing: 'Orden no encontrada.',
      order_not_editable: 'Solo se pueden editar órdenes pendientes sin recepciones. Actualiza la lista.',
      order_changed: 'La orden cambió desde que abriste la edición. Actualiza la lista y vuelve a intentarlo.',
      invalid_order: 'La orden tiene datos inconsistentes y requiere revisión.',
      invalid_details: 'Revisa la fecha y las notas.',
      version_overflow: 'La orden requiere revisión antes de editarse nuevamente.',
    };
    if (error.code === 'P0001' && messages[error.message]) {
      return NextResponse.json({ error: messages[error.message] }, { status: error.message === 'order_missing' ? 404 : 409 });
    }
    console.error('Purchase details update failed:', error);
    return NextResponse.json({ error: 'No se pudo confirmar la edición. Actualiza la lista antes de reintentar.' }, { status: 500 });
  }
  return NextResponse.json(data);
}
