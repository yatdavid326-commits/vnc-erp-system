import { NextResponse } from 'next/server';
import { authorizeModule } from '@/lib/services/modules/authorization';
import { purchaseReportSchema, reportPeriodSchema } from '@/lib/purchaseReport';

export async function GET(request: Request) {
  const reportAuth = await authorizeModule(request, 'reports', 'can_view');
  if (reportAuth.error) return reportAuth.error;
  const purchaseAuth = await authorizeModule(request, 'purchases', 'can_view');
  if (purchaseAuth.error) return purchaseAuth.error;

  const params = new URL(request.url).searchParams;
  let invalidParam = false;
  params.forEach((_, key) => { if (key !== 'from' && key !== 'to') invalidParam = true; });
  if (invalidParam || params.getAll('from').length > 1 || params.getAll('to').length > 1) {
    return NextResponse.json({ error: 'El periodo indicado no es válido.' }, { status: 400 });
  }
  const period = reportPeriodSchema.safeParse({
    from: params.has('from') ? params.get('from') : undefined,
    to: params.has('to') ? params.get('to') : undefined,
  });
  if (!period.success) {
    return NextResponse.json({ error: 'Indica ambas fechas válidas y en orden.' }, { status: 400 });
  }

  const { data, error } = await purchaseAuth.client.rpc('purchase_status_report', {
    p_start: period.data.from ?? null,
    p_end: period.data.to ?? null,
  });
  if (error) {
    console.error('Purchase report failed:', error);
    return NextResponse.json({ error: 'No se pudo consultar el informe de compras.' }, { status: 500 });
  }
  const parsed = purchaseReportSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Purchase report returned invalid data:', parsed.error);
    return NextResponse.json({ error: 'El informe de compras recibido no es válido.' }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
