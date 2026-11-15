import { NextResponse } from 'next/server';
import { authorizeModule } from '@/lib/services/modules/authorization';
import { lowStockSchema } from '@/lib/lowStock';

export async function GET(request: Request) {
  const auth = await authorizeModule(request, 'inventory', 'can_view');
  if (auth.error) return auth.error;

  const { data, error } = await auth.client.rpc('dashboard_low_stock');
  if (error) {
    console.error('Low stock summary failed:', error);
    return NextResponse.json({ error: 'No se pudo consultar el bajo stock.' }, { status: 500 });
  }
  const parsed = lowStockSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Low stock summary returned invalid data:', parsed.error);
    return NextResponse.json({ error: 'El resumen de bajo stock no es válido.' }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
