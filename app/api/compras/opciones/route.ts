import { NextRequest, NextResponse } from 'next/server';
import { comprasService } from '@/lib/services/compras/comprasService';
import { purchaseErrorResponse } from '../errors';

export async function GET(request: NextRequest) {
  try {
    const kind = request.nextUrl.searchParams.get('kind');
    const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
    if ((kind !== 'suppliers' && kind !== 'products') || search.length > 100 || /[\u0000-\u001f\u007f]/.test(search)) {
      return NextResponse.json({ error: 'Búsqueda inválida.' }, { status: 400 });
    }
    const data = await comprasService.options(kind, search);
    return NextResponse.json({ data });
  } catch (error) {
    return purchaseErrorResponse(error, 'GET /api/compras/opciones');
  }
}
