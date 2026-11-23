import { productService } from '@/lib/services/products/productService';
import { NextRequest, NextResponse } from 'next/server';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { productUpdateSchema } from '@/lib/validation/requestSchemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const product = await productService.getById((await params).id);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error(`GET /api/inventario/${(await params).id} error:`, error);
    return NextResponse.json(
      { error: 'Error fetching product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedBody = await validateRequestBody(request, productUpdateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const product = await productService.update((await params).id, body);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error(`PUT /api/inventario/${(await params).id} error:`, error);
    return NextResponse.json(
      { error: 'Error updating product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deleted = await productService.delete((await params).id);
    if (!deleted) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/inventario/${(await params).id} error:`, error);
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P0001'
    ) {
      return NextResponse.json(
        { error: 'No se puede eliminar un producto con existencias; registra una salida primero.' },
        { status: 409 }
      );
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23503'
    ) {
      return NextResponse.json(
        { error: 'No se puede eliminar un producto que tiene movimientos asociados.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error deleting product' },
      { status: 500 }
    );
  }
}
