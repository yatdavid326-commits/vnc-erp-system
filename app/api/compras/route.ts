import { NextResponse } from 'next/server';
import { purchaseSchema } from '@/lib/purchases';
import { authorizeModule } from '@/lib/services/modules/authorization';

export async function GET(request: Request) {
  const auth = await authorizeModule(request, 'purchases', 'can_view');
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const page = params.get('page') ?? '1';
  if (!/^[1-9]\d{0,5}$/.test(page)) return NextResponse.json({ error: 'Página inválida.' }, { status: 400 });
  const start = (Number(page) - 1) * 25;
  const { data, error, count } = await auth.client.from('purchase_orders')
    .select('id, po_number, order_date, status, total_amount, notes, supplier:suppliers(name), items:purchase_order_items(id, quantity_ordered, unit_price, line_total, product:products(name, product_code))', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id')
    .range(start, start + 24);
  if (error) {
    console.error('Purchase list failed:', error);
    return NextResponse.json({ error: 'No se pudieron consultar las compras.' }, { status: 500 });
  }
  return NextResponse.json({ data, count });
}

export async function POST(request: Request) {
  const auth = await authorizeModule(request, 'purchases', 'can_create');
  if (auth.error) return auth.error;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 });
  }
  const result = purchaseSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: 'Revisa los datos de la orden y sus productos.' }, { status: 400 });
  const input = result.data;
  const { data, error } = await auth.client.rpc('create_purchase_order', {
    p_id: input.id, p_number: input.number, p_supplier: input.supplier_id,
    p_date: input.order_date, p_notes: input.notes, p_items: input.items, p_actor: auth.profileId,
  });
  if (error) {
    const messages: Record<string, string> = {
      supplier_inactive: 'El proveedor no existe o está inactivo.',
      product_inactive: 'Un producto no existe o está inactivo.',
      duplicate_product: 'Un producto aparece más de una vez.',
      total_overflow: 'El total supera el máximo permitido.',
      purchase_conflict: 'La solicitud ya se utilizó con otros datos. Revisa las órdenes.',
      invalid_purchase: 'Revisa los datos de la orden y sus productos.',
    };
    if (error.code === 'P0001' && messages[error.message]) return NextResponse.json({ error: messages[error.message] }, { status: 409 });
    if (error.code === '23505') return NextResponse.json({ error: 'El número de orden ya existe.' }, { status: 409 });
    console.error('Purchase creation failed:', error);
    return NextResponse.json({ error: 'No se pudo confirmar la orden. Revisa la lista antes de reintentar.' }, { status: 500 });
  }
  return NextResponse.json(data);
}
