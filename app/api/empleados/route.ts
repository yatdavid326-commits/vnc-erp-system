import { NextRequest, NextResponse } from 'next/server';
import { empleadosService } from '@/lib/services/empleados/empleadosService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { employeeCreateSchema } from '@/lib/validation/requestSchemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    if (status && status !== 'activo' && status !== 'inactivo') {
      return NextResponse.json({ error: 'Estado de empleado no válido.' }, { status: 400 });
    }

    const result = await empleadosService.getAll(page, limit, {
      search: search ?? undefined,
      status: status === 'activo' || status === 'inactivo' ? status : undefined,
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
    console.error('GET /api/empleados error:', error);
    return NextResponse.json(
      { error: 'Error fetching employees', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await validateRequestBody(request, employeeCreateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const result = await empleadosService.create({
      nombre: body.nombre,
      apellido: body.apellido || '',
      email: body.email,
      telefono: body.telefono ?? body.teléfono ?? '',
      cargo: body.cargo ?? body.puesto ?? '',
      departamento: body.departamento || '',
      fecha_ingreso: body.fecha_ingreso || new Date().toISOString().slice(0, 10),
      salario: body.salario || 0,
      estado: body.estado === 'inactivo' || body.estado === false ? 'inactivo' : 'activo',
    });

    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/empleados error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error creating employee', details: errorMessage },
      { status: 500 }
    );
  }
}

