import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProfileId } from '@/lib/auth/getAuthenticatedProfileId';
import { purchaseCreateSchema } from '@/lib/purchases';
import { comprasService } from '@/lib/services/compras/comprasService';
import { parsePaginationParams } from '@/lib/utils/pagination';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { purchaseErrorResponse } from './errors';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const pagination = parsePaginationParams(params);
    if ('error' in pagination) return NextResponse.json({ error: pagination.error }, { status: 400 });
    const status = params.get('status');
    const supplierId = params.get('proveedor_id');
    const search = params.get('search') ?? '';
    if ((status && !['pending', 'partial', 'partially_received', 'received', 'cancelled'].includes(status))
      || (supplierId && !z.string().uuid().safeParse(supplierId).success)
      || search.length > 100 || /[\u0000-\u001f\u007f]/.test(search)) {
      return NextResponse.json({ error: 'Filtros de compras no válidos.' }, { status: 400 });
    }
    const { data, count } = await comprasService.getAll(pagination.page, pagination.limit, {
      search, status: status ?? undefined, supplierId: supplierId ?? undefined,
    });
    return NextResponse.json(data, { headers: {
      'X-Total-Count': String(count), 'X-Page': String(pagination.page), 'X-Limit': String(pagination.limit),
    } });
  } catch (error) {
    return purchaseErrorResponse(error, 'GET /api/compras');
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await validateRequestBody(request, purchaseCreateSchema);
    if (!input.success) return input.response;
    const actor = await getAuthenticatedProfileId(request);
    const data = await comprasService.create(input.data, actor);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return purchaseErrorResponse(error, 'POST /api/compras');
  }
}
