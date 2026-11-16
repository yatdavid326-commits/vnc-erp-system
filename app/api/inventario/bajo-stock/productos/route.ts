import { NextResponse } from 'next/server';
import { authorizeModule } from '@/lib/services/modules/authorization';
import {
  buildLowStockProductsReport,
  lowStockProductsPageSize,
  lowStockProductsReportSchema,
  type LowStockInventoryRow,
  type LowStockProductRow,
} from '@/lib/lowStock';

const maxPage = 10000;
const fetchBatch = 1000;
const maxRows = 200000;

type BatchResult<T> = { data: T[] | null; error: unknown };

// PostgREST devuelve como máximo 1,000 filas por consulta: se leen todas por lotes ordenados por id.
async function fetchAll<T>(load: (from: number, to: number) => PromiseLike<BatchResult<T>>) {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += fetchBatch) {
    const { data, error } = await load(from, from + fetchBatch - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < fetchBatch) return rows;
  }
  throw new Error('low_stock_too_many_rows');
}

export async function GET(request: Request) {
  const reportAuth = await authorizeModule(request, 'reports', 'can_view');
  if (reportAuth.error) return reportAuth.error;
  const inventoryAuth = await authorizeModule(request, 'inventory', 'can_view');
  if (inventoryAuth.error) return inventoryAuth.error;

  const params = new URL(request.url).searchParams;
  const rawPage = params.get('page') ?? '1';
  let invalidParam = false;
  params.forEach((_, key) => {
    if (key !== 'page') invalidParam = true;
  });
  if (params.getAll('page').length > 1 || invalidParam
      || !/^[1-9]\d{0,4}$/.test(rawPage) || Number(rawPage) > maxPage) {
    return NextResponse.json({ error: 'Indica una página válida.' }, { status: 400 });
  }
  const page = Number(rawPage);
  const client = inventoryAuth.client;

  let report;
  try {
    const [products, inventory] = await Promise.all([
      fetchAll<LowStockProductRow>((from, to) => client.from('products')
        .select('id, product_code, name, reorder_level')
        .eq('is_active', true)
        .order('id')
        .range(from, to)),
      fetchAll<LowStockInventoryRow>((from, to) => client.from('inventory')
        .select('product_id, quantity_on_hand')
        .order('product_id')
        .range(from, to)),
    ]);
    report = buildLowStockProductsReport(products, inventory, page, lowStockProductsPageSize);
  } catch (error) {
    console.error('Low stock product report failed:', error);
    return NextResponse.json({ error: 'No se pudo consultar el listado de bajo stock.' }, { status: 500 });
  }

  const parsed = lowStockProductsReportSchema.safeParse(report);
  if (!parsed.success) {
    console.error('Low stock product report produced invalid data:', parsed.error);
    return NextResponse.json({ error: 'El listado de bajo stock recibido no es válido.' }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { headers: { 'Cache-Control': 'no-store' } });
}
