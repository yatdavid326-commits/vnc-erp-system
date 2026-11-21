import { NextRequest, NextResponse } from 'next/server';
import { comprasService } from '@/lib/services/compras/comprasService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await comprasService.getById((await params).id);
    if (result.error) throw new Error(result.error);
    if (!result.data) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('GET /api/compras/[id] error:', error);
    return NextResponse.json(
      { error: 'Error fetching purchase order', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const result = await comprasService.update((await params).id, body);
    if (result.error) throw new Error(result.error);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('PUT /api/compras/[id] error:', error);
    return NextResponse.json(
      { error: 'Error updating purchase order', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await comprasService.delete((await params).id);
    if (result.error) throw new Error(result.error);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/compras/[id] error:', error);
    return NextResponse.json(
      { error: 'Error deleting purchase order', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
