import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/lib/services/products/productService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { productCreateSchema } from '@/lib/validation/requestSchemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    if (status && status !== 'activo' && status !== 'inactivo') {
      return NextResponse.json({ error: 'Estado de producto no válido.' }, { status: 400 });
    }

    const result = await productService.getAll(
      page,
      limit,
      search,
      category,
      status as 'activo' | 'inactivo' | ''
    );

    return NextResponse.json(result.data, {
      headers: {
        'X-Total-Count': result.total.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/inventario error:', error);
    return NextResponse.json(
      { error: 'Error fetching inventory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await validateRequestBody(request, productCreateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const product = await productService.create({
      nombre: body.nombre,
      sku: body.sku,
      descripcion: body.descripcion || '',
      categoria: body.categoria || '',
      costo_unitario: body.costo_unitario || 0,
      precio_venta: body.precio_venta,
      stock_minimo: body.stock_minimo || 0,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/inventario error:', error);
    return NextResponse.json(
      { error: 'Error creating product' },
      { status: 500 }
    );
  }
}
