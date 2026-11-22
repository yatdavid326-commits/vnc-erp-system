import { NextRequest, NextResponse } from 'next/server';
import { proveedoresService } from '@/lib/services/proveedores/proveedoresService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { supplierCreateSchema } from '@/lib/validation/requestSchemas';
import { parsePaginationParams } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationParams(searchParams);
    if ('error' in pagination) {
      return NextResponse.json({ error: pagination.error }, { status: 400 });
    }
    const { page, limit } = pagination;
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    const status = searchParams.get('status');
    if (status && status !== 'activo' && status !== 'inactivo') {
      return NextResponse.json({ error: 'Estado de proveedor no válido.' }, { status: 400 });
    }

    const result = await proveedoresService.getAll(page, limit, {
      search: search ?? undefined,
      status: status === 'activo' || status === 'inactivo' ? status : undefined,
      country: country ?? undefined,
    });
    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, {
      headers: {
        'X-Total-Count': result.count.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/proveedores error:', error);
    return NextResponse.json(
      { error: 'Error fetching suppliers', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await validateRequestBody(request, supplierCreateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const result = await proveedoresService.create({
      nombre: body.nombre,
      persona_contacto: body.persona_contacto || '',
      email: body.email,
      teléfono: body.teléfono || '',
      dirección: body.dirección || '',
      ciudad: body.ciudad || '',
      estado: body.estado || '',
      país: body.país || 'Guatemala',
      términos_pago: body.términos_pago || '',
      activo: body.activo !== false,
    });

    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/proveedores error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error creating supplier', details: errorMessage },
      { status: 500 }
    );
  }
}
