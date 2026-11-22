import { NextRequest, NextResponse } from 'next/server';
import { comprasService } from '@/lib/services/compras/comprasService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { purchaseCreateSchema } from '@/lib/validation/requestSchemas';
import { parsePaginationParams } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationParams(searchParams);
    if ('error' in pagination) {
      return NextResponse.json({ error: pagination.error }, { status: 400 });
    }
    const { page, limit } = pagination;
    const status = searchParams.get('status');
    const supplierId = searchParams.get('proveedor_id');
    const allowedStatuses = ['pending', 'partial', 'received', 'cancelled'];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado de orden no válido.' }, { status: 400 });
    }

    const result = await comprasService.getAll(page, limit, {
      search: searchParams.get('search') ?? undefined,
      status: status ?? undefined,
      supplierId: supplierId ?? undefined,
    });
    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, {
      headers: {
        'X-Total-Count': result.count.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/compras error:', error);
    return NextResponse.json(
      { error: 'Error fetching purchases', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await validateRequestBody(request, purchaseCreateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const result = await comprasService.create({
      numero_po: body.numero_po,
      proveedor_id: body.proveedor_id,
      fecha_orden: body.fecha_orden,
      fecha_entrega_esperada: body.fecha_entrega_esperada ?? null,
      estado: body.estado || 'pending',
      monto_total: body.monto_total || 0,
    });

    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/compras error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error creating purchase order', details: errorMessage },
      { status: 500 }
    );
  }
}
