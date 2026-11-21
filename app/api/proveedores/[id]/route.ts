import { NextRequest, NextResponse } from 'next/server';
import { proveedoresService } from '@/lib/services/proveedores/proveedoresService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { supplierUpdateSchema } from '@/lib/validation/requestSchemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await proveedoresService.getById((await params).id);
    if (result.error) throw new Error(result.error);
    if (!result.data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('GET /api/proveedores/[id] error:', error);
    return NextResponse.json(
      { error: 'Error fetching supplier', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedBody = await validateRequestBody(request, supplierUpdateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    const result = await proveedoresService.update((await params).id, body);
    if (result.error) throw new Error(result.error);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('PUT /api/proveedores/[id] error:', error);
    return NextResponse.json(
      { error: 'Error updating supplier', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await proveedoresService.delete((await params).id);
    if (result.error) throw new Error(result.error);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/proveedores/[id] error:', error);
    return NextResponse.json(
      { error: 'Error deleting supplier', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
