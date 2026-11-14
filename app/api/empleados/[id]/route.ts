import { NextRequest, NextResponse } from 'next/server';
import { empleadosService } from '@/lib/services/empleados/empleadosService';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const result = await empleadosService.update(params.id, body);

    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data);
  } catch (error) {
    console.error(`PUT /api/empleados/[id] error:`, error);
    return NextResponse.json(
      { error: 'Error updating employee', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await empleadosService.delete(params.id);

    if (result.error) throw new Error(result.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/empleados/[id] error:`, error);
    return NextResponse.json(
      { error: 'Error deleting employee', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
