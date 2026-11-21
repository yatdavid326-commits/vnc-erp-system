import { posService } from '@/lib/services/pos/posService';
import { NextRequest, NextResponse } from 'next/server';

function getPagination(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 50);

  if (!Number.isInteger(page) || page < 1) {
    return { error: 'page must be a positive integer' } as const;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: 'limit must be an integer between 1 and 100' } as const;
  }
  return { page, limit } as const;
}

export async function GET(request: NextRequest) {
  const pagination = getPagination(request);
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
