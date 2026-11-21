import { NextRequest, NextResponse } from 'next/server';
import { proveedoresService } from '@/lib/services/proveedores/proveedoresService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { supplierCreateSchema } from '@/lib/validation/requestSchemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const country = searchParams.get('country');

    if (search) {
      const results = await proveedoresService.search(search, limit);
      if (results.error) throw new Error(results.error);
      return NextResponse.json(results.data);
    }

    if (country) {
      const result = await proveedoresService.getByCountry(country, page, limit);
      if (result.error) throw new Error(result.error);
      return NextResponse.json(result.data, {
        headers: {
          'X-Total-Count': result.count.toString(),
          'X-Page': page.toString(),
          'X-Limit': limit.toString(),
        },
      });
    }

    const result = await proveedoresService.getAll(page, limit);
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
