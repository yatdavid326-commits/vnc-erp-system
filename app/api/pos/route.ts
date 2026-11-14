import { posService } from '@/lib/services/pos/posService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await posService.getAll(page, limit);
    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, {
      headers: {
        'X-Total-Count': result.data?.length.toString() || '0',
      },
    });
  } catch (error) {
    console.error('GET /api/pos error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching POS transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await posService.create(body);
    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/pos error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error creating POS transaction' },
      { status: 500 }
    );
  }
}
