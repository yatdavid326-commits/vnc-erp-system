import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { customerCreateSchema } from '@/lib/validation/requestSchemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const allowedTypes = ['retail', 'wholesale', 'business'];
    const allowedStatuses = ['activo', 'inactivo', 'suspendido'];

    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo de cliente no válido.' }, { status: 400 });
    }
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado de cliente no válido.' }, { status: 400 });
    }

    const { data, error, count } = await customerService.getAll(page, limit, {
      search: searchParams.get('search') ?? undefined,
      status: status as 'activo' | 'inactivo' | 'suspendido' | undefined,
      type: type as 'retail' | 'wholesale' | 'business' | undefined,
    });
    if (error) throw error;
    
    return NextResponse.json(data, {
      headers: {
        'X-Total-Count': count.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/clientes error:', error);
    return NextResponse.json(
      { error: 'Error fetching clients', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await validateRequestBody(request, customerCreateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const cliente = await customerService.create({
      nombre: body.nombre,
      email: body.email,
      telefono: body.telefono,
      direccion: body.direccion,
      ciudad: body.ciudad,
      estado: body.estado,
      codigo_postal: body.codigo_postal,
      tipo: body.tipo ?? 'retail',
      limite_credito: body.limite_credito ?? 0,
      saldo_actual: body.saldo_actual ?? 0,
      estado_cliente: body.estado_cliente ?? 'activo',
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error('POST /api/clientes error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error creating client', details: errorMessage },
      { status: 500 }
    );
  }
}
