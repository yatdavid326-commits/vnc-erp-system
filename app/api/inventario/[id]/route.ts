import { productService } from '@/lib/services/products/productService';
import { NextRequest, NextResponse } from 'next/server';

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
    const body = await request.json();

    const product = await productService.update((await params).id, body);

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
    await productService.delete((await params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/inventario/${(await params).id} error:`, error);
    return NextResponse.json(
      { error: 'Error deleting product' },
      { status: 500 }
    );
  }
}
