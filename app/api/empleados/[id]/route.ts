import { NextRequest, NextResponse } from 'next/server';
import { empleadosService } from '@/lib/services/empleados/empleadosService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { employeeUpdateSchema } from '@/lib/validation/requestSchemas';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await empleadosService.getById((await params).id);
    if (result.error) throw new Error(result.error);
    if (!result.data) return NextResponse.json({ error: 'Empleado no encontrado.' }, { status: 404 });
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('GET /api/empleados/[id] error:', error);
    return NextResponse.json(
      { error: 'Error al consultar el empleado.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsedBody = await validateRequestBody(request, employeeUpdateSchema);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    const result = await empleadosService.update((await params).id, {
      ...body,
      telefono: body.telefono ?? body.teléfono,
      cargo: body.cargo ?? body.puesto,
    });

    if (result.error) throw new Error(result.error);
    if (!result.data) {
      return NextResponse.json({ error: 'Empleado no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error(`PUT /api/empleados/[id] error:`, error);
    return NextResponse.json(
      { error: 'Error updating employee', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await empleadosService.delete((await params).id);
    if (result.error) {
      if (result.error.includes('foreign key constraint')) {
        return NextResponse.json(
          { error: 'No se puede eliminar un empleado con registros de asistencia.' },
          { status: 409 }
        );
      }
      throw new Error(result.error);
    }
    if (!result.success) throw new Error('No se pudo eliminar el empleado.');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/empleados/[id] error:`, error);
    return NextResponse.json(
      { error: 'Error deleting employee', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
