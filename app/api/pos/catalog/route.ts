import { posService } from '@/lib/services/pos/posService';
import { NextRequest, NextResponse } from 'next/server';
import { parsePaginationParams } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  const pagination = parsePaginationParams(request.nextUrl.searchParams, 100);
  if ('error' in pagination) {
    return NextResponse.json({ error: pagination.error }, { status: 400 });
  }

  try {
    const search = request.nextUrl.searchParams.get('search') ?? '';
    const result = await posService.getCatalog(
      pagination.page,
      pagination.limit,
      search
    );
    return NextResponse.json(result.data, {
      headers: { 'X-Total-Count': result.count.toString() },
    });
  } catch (error) {
    console.error('GET /api/pos/catalog error:', error);
    return NextResponse.json(
      { error: 'No se pudo cargar el catálogo de POS.' },
      { status: 500 }
    );
  }
}
