import { NextResponse } from 'next/server';
import { inventoryValuationReportSchema } from '@/lib/inventoryValuationReport';
import { authorizeModule } from '@/lib/services/modules/authorization';

export async function GET(request: Request) {
  const reportAuth = await authorizeModule(request, 'reports', 'can_view');
  if (reportAuth.error) return reportAuth.error;
  const inventoryAuth = await authorizeModule(request, 'inventory', 'can_view');
  if (inventoryAuth.error) return inventoryAuth.error;

  const { data, error } = await inventoryAuth.client.rpc('inventory_valuation_report');
  if (error) {
    console.error('Inventory valuation report failed:', error);
    return NextResponse.json({ error: 'No se pudo consultar la valoración del inventario.' }, { status: 500 });
  }
  const parsed = inventoryValuationReportSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Inventory valuation report returned invalid data:', parsed.error);
    return NextResponse.json({ error: 'La valoración del inventario recibida no es válida.' }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
