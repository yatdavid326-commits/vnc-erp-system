import { NextRequest, NextResponse } from 'next/server';
import { asistenciaService } from '@/lib/services/asistencia/asistenciaService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { attendanceCreateSchema } from '@/lib/validation/requestSchemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const empleadoId = searchParams.get('empleado_id') || undefined;
    const desde = searchParams.get('desde') || undefined;
    const hasta = searchParams.get('hasta') || undefined;
    const estado = searchParams.get('estado');
    const validDate = (date: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const parsedDate = new Date(`${date}T00:00:00.000Z`);
      return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
    };

    if (desde && !validDate(desde)) {
      return NextResponse.json({ error: 'Fecha inicial no válida.' }, { status: 400 });
    }
    if (hasta && !validDate(hasta)) {
      return NextResponse.json({ error: 'Fecha final no válida.' }, { status: 400 });
    }
    if (desde && hasta && desde > hasta) {
      return NextResponse.json({ error: 'El rango de fechas no es válido.' }, { status: 400 });
    }
    if (estado && estado !== 'completa' && estado !== 'pendiente') {
      return NextResponse.json({ error: 'Estado de asistencia no válido.' }, { status: 400 });
    }

    const result = await asistenciaService.getAll(page, limit, {
      empleadoId,
      desde,
      hasta,
      estado: estado === 'completa' || estado === 'pendiente' ? estado : undefined,
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
    console.error('GET /api/asistencia error:', error);
    return NextResponse.json(
      { error: 'Error fetching attendance', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await validateRequestBody(
      request,
      attendanceCreateSchema
    );
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

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

