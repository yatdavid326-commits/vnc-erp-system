import { NextResponse } from 'next/server';
import { recentPurchasesSchema } from '@/lib/purchases';
import { authorizeModule } from '@/lib/services/modules/authorization';

export async function GET(request: Request) {
  const auth = await authorizeModule(request, 'purchases', 'can_view');
  if (auth.error) return auth.error;

  const { data, error } = await auth.client.from('purchase_orders')
    .select('id, po_number, order_date, status')
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Recent purchases failed:', error);
    return NextResponse.json({ error: 'No se pudieron consultar las compras recientes.' }, { status: 500 });
  }
  const parsed = recentPurchasesSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Recent purchases returned invalid data:', parsed.error);
    return NextResponse.json({ error: 'Las compras recientes recibidas no son válidas.' }, { status: 500 });
  }
  return NextResponse.json({ items: parsed.data }, { headers: { 'Cache-Control': 'no-store' } });
}
