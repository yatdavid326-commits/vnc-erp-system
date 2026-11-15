import { NextResponse } from 'next/server';
import { authorizeModule } from '@/lib/services/modules/authorization';

export async function GET(request: Request) {
  const auth = await authorizeModule(request, 'inventory', 'can_view');
  if (auth.error) return auth.error;

  const { count, error } = await auth.client.from('inventory')
    .select('product_id, products!inner(id)', { count: 'exact', head: true })
    .eq('products.is_active', true)
    .gt('quantity_on_hand', 0);

  if (error || count === null) {
    console.error('Inventory summary failed:', error ?? 'Missing count');
    return NextResponse.json({ error: 'No se pudo consultar el resumen de inventario.' }, { status: 500 });
  }
  return NextResponse.json({ products_in_stock: count });
}
