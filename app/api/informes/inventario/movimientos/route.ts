import { NextResponse } from 'next/server';
import { inventoryMovementReportPageSize, inventoryMovementReportSchema, reportPeriodSchema } from '@/lib/inventoryMovementReport';
import { authorizeModule } from '@/lib/services/modules/authorization';

const maxPage = 10000;

export async function GET(request: Request) {
  const reportAuth = await authorizeModule(request, 'reports', 'can_view');
  if (reportAuth.error) return reportAuth.error;
  const inventoryAuth = await authorizeModule(request, 'inventory', 'can_view');
  if (inventoryAuth.error) return inventoryAuth.error;

  const params = new URL(request.url).searchParams;
  let invalidParam = false;
  params.forEach((_, key) => {
    if (!['from', 'to', 'page'].includes(key)) invalidParam = true;
  });
  if (invalidParam || params.getAll('from').length > 1 || params.getAll('to').length > 1
      || params.getAll('page').length > 1) {
    return NextResponse.json({ error: 'Los filtros indicados no son válidos.' }, { status: 400 });
  }

  const period = reportPeriodSchema.safeParse({
    from: params.has('from') ? params.get('from') : undefined,
    to: params.has('to') ? params.get('to') : undefined,
  });
  const rawPage = params.get('page') ?? '1';
  if (!period.success || !/^[1-9]\d{0,4}$/.test(rawPage) || Number(rawPage) > maxPage) {
    return NextResponse.json({ error: 'Indica un periodo y una página válidos.' }, { status: 400 });
  }

  const { data, error } = await inventoryAuth.client.rpc('inventory_movement_report', {
    p_start: period.data.from ?? null,
    p_end: period.data.to ?? null,
    p_page: Number(rawPage),
    p_page_size: inventoryMovementReportPageSize,
  });
  if (error) {
    console.error('Inventory movement report failed:', error);
    return NextResponse.json({ error: 'No se pudo consultar el informe de movimientos.' }, { status: 500 });
  }
  const parsed = inventoryMovementReportSchema.safeParse(data);
  if (!parsed.success || parsed.data.page !== Number(rawPage)) {
    console.error('Inventory movement report returned invalid data:', parsed.success ? 'unexpected page' : parsed.error);
    return NextResponse.json({ error: 'El informe de movimientos recibido no es válido.' }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
