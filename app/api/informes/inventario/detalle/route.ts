import { NextResponse } from 'next/server';
import { authorizeModule } from '@/lib/services/modules/authorization';
import {
  inventoryDetailCsvHeader,
  inventoryDetailCsvRow,
  inventoryDetailPageSchema,
  type InventoryDetailRow,
} from '@/lib/inventoryDetailReport';
import { csvRecords } from '@/lib/reportCsv';

const pageSize = 1000;
const maxRows = 50_000;

export async function GET(request: Request) {
  const reportAuth = await authorizeModule(request, 'reports', 'can_view');
  if (reportAuth.error) return reportAuth.error;
  const inventoryAuth = await authorizeModule(request, 'inventory', 'can_view');
  if (inventoryAuth.error) return inventoryAuth.error;

  const rows: InventoryDetailRow[] = [];
  let cursor: string | null = null;
  while (true) {
    const limit = Math.min(pageSize, maxRows + 1 - rows.length);
    const { data, error } = await inventoryAuth.client.rpc('inventory_detail_report_page', {
      p_after_id: cursor,
      p_limit: limit,
    });
    if (error) {
      console.error('Inventory detail report failed:', error);
      return NextResponse.json({ error: 'No se pudo consultar el detalle del inventario.' }, { status: 500 });
    }

    const parsed = inventoryDetailPageSchema.safeParse(data);
    if (!parsed.success) {
      console.error('Inventory detail report returned invalid data:', parsed.error);
      return NextResponse.json({ error: 'El detalle del inventario recibido no es válido.' }, { status: 500 });
    }
    if (parsed.data.some((row, index) =>
      index === 0 ? cursor !== null && row.id <= cursor : row.id <= parsed.data[index - 1].id
    )) {
      console.error('Inventory detail report returned rows outside keyset order.');
      return NextResponse.json({ error: 'El detalle del inventario recibido no está ordenado.' }, { status: 500 });
    }

    rows.push(...parsed.data);
    if (rows.length > maxRows) {
      return NextResponse.json({ error: 'El informe supera el límite de 50,000 productos activos.' }, { status: 413 });
    }
    if (parsed.data.length < limit) break;
    cursor = parsed.data[parsed.data.length - 1].id;
  }

  const csv = csvRecords(inventoryDetailCsvHeader, rows.map(inventoryDetailCsvRow));
  return new NextResponse(csv, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="informe-inventario-detalle.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}
