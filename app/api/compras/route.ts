import { NextRequest, NextResponse } from 'next/server';
import { comprasService } from '@/lib/services/compras/comprasService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { purchaseCreateSchema } from '@/lib/validation/requestSchemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    if (search) {
      const results = await comprasService.search(search, limit);
      if (results.error) throw new Error(results.error);
      return NextResponse.json(results.data);
    }

    const result = await comprasService.getAll(page, limit);
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
      fecha_entrega_esperada: body.fecha_entrega_esperada || '',
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
