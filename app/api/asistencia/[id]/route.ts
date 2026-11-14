import { NextRequest, NextResponse } from 'next/server';
import { asistenciaService } from '@/lib/services/asistencia/asistenciaService';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const result = await asistenciaService.update(params.id, body);

    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data);
  } catch (error) {
    console.error(`PUT /api/asistencia/[id] error:`, error);
    return NextResponse.json(
      { error: 'Error updating attendance', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await asistenciaService.delete(params.id);

    if (result.error) throw new Error(result.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/asistencia/[id] error:`, error);
    return NextResponse.json(
      { error: 'Error deleting attendance', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
