import { NextRequest, NextResponse } from 'next/server';
import { asistenciaService } from '@/lib/services/asistencia/asistenciaService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const empleadoId = searchParams.get('empleado_id');

    if (empleadoId) {
      const result = await asistenciaService.getByEmpleado(empleadoId, limit);
      if (result.error) throw new Error(result.error);
      return NextResponse.json(result.data);
    }

    const result = await asistenciaService.getAll(page, limit);
    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, {
      headers: {
        'X-Total-Count': result.count.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/asistencia error:', error);
    return NextResponse.json(
      { error: 'Error fetching attendance', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.empleado_id || !body.fecha || !body.hora_entrada) {
      return NextResponse.json(
        { error: 'empleado_id, fecha, and hora_entrada are required' },
        { status: 400 }
      );
    }

    const result = await asistenciaService.create({
      empleado_id: body.empleado_id,
      fecha: body.fecha,
      hora_entrada: body.hora_entrada,
      hora_salida: body.hora_salida || null,
      latitud_entrada: body.latitud_entrada,
      longitud_entrada: body.longitud_entrada,
      latitud_salida: body.latitud_salida || null,
      longitud_salida: body.longitud_salida || null,
      qr_code: body.qr_code || null,
      observaciones: body.observaciones || '',
    });

    if (result.error) throw new Error(result.error);

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('POST /api/asistencia error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error creating attendance record', details: errorMessage },
      { status: 500 }
    );
  }
}

