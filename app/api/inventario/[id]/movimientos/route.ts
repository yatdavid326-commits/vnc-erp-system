import { NextResponse } from 'next/server';
import { z } from 'zod';
import { movementSchema } from '@/lib/inventoryMovement';
import { authorizeModule } from '@/lib/services/modules/authorization';

type Context = { params: Promise<{ id: string }> };
const messages: Record<string, string> = {
  product_missing: 'Producto no encontrado.',
  product_inactive: 'No se pueden registrar movimientos para un producto inactivo.',
  stock_uninitialized: 'Registra primero un ajuste con la cantidad contada.',
  invalid_stock: 'Las existencias actuales son inconsistentes y requieren revisión.',
  insufficient_stock: 'La cantidad no puede ser menor que las unidades reservadas o disponibles.',
  stock_overflow: 'La cantidad supera el máximo permitido.',
  movement_conflict: 'La solicitud ya se utilizó con otros datos. Revisa el historial antes de continuar.',
  invalid_movement: 'Revisa los datos del movimiento.',
};

export async function GET(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'inventory', 'can_view');
  if (auth.error) return auth.error;
  const { id } = await params;
  const rawPage = new URL(request.url).searchParams.get('page') ?? '1';
  if (!z.string().uuid().safeParse(id).success || !/^[1-9]\d{0,5}$/.test(rawPage)) {
    return NextResponse.json({ error: 'Identificador o página inválidos.' }, { status: 400 });
  }
  const page = Number(rawPage);
  const { data, error, count } = await auth.client.from('inventory_movements')
    .select('id, movement_type, quantity, notes, created_at, actor:user_profiles(full_name)', { count: 'exact' })
    .eq('product_id', id).order('created_at', { ascending: false }).order('id', { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  if (error) {
    console.error('Inventory movement history failed:', error);
    return NextResponse.json({ error: 'No se pudo consultar el historial.' }, { status: 500 });
  }
  return NextResponse.json({ data, count, page, pageSize: 25 });
}

export async function POST(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'inventory', 'can_edit');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 });
  }
  const input = movementSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: 'Revisa los datos del movimiento.' }, { status: 400 });
  const { data, error } = await auth.client.rpc('record_manual_inventory_movement', {
    p_id: input.data.id, p_product_id: id, p_actor_id: auth.profileId,
    p_type: input.data.type, p_quantity: input.data.quantity, p_notes: input.data.notes,
  });
  if (error) {
    if (error.code === 'P0001' && messages[error.message]) {
      return NextResponse.json({ error: messages[error.message] }, { status: error.message === 'product_missing' ? 404 : 409 });
    }
    if (error.code === '23505') {
      return NextResponse.json({ error: messages.movement_conflict }, { status: 409 });
    }
    console.error('Inventory movement failed:', error);
    return NextResponse.json({ error: 'No se pudo registrar el movimiento. Revisa el historial antes de reintentar.' }, { status: 500 });
  }
  return NextResponse.json(data);
}
