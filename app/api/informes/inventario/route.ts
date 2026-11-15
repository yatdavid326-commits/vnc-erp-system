import { NextResponse } from 'next/server';
import { authorizeModule } from '@/lib/services/modules/authorization';
import { inventoryReportSchema } from '@/lib/inventoryReport';

export async function GET(request: Request) {
  const reportAuth = await authorizeModule(request, 'reports', 'can_view');
  if (reportAuth.error) return reportAuth.error;
  const inventoryAuth = await authorizeModule(request, 'inventory', 'can_view');
  if (inventoryAuth.error) return inventoryAuth.error;

  const { data, error } = await inventoryAuth.client.rpc('inventory_status_report');
  if (error) {
    console.error('Inventory report failed:', error);
    return NextResponse.json({ error: 'No se pudo consultar el informe de inventario.' }, { status: 500 });
  }
  const parsed = inventoryReportSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Inventory report returned invalid data:', parsed.error);
    return NextResponse.json({ error: 'El informe de inventario recibido no es válido.' }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
