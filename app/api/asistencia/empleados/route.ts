import { supabaseAdmin } from '@/lib/db/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('empleados')
    .select('id, nombre, apellido, estado')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('GET /api/asistencia/empleados error:', error);
    return NextResponse.json({ error: 'No se pudieron consultar los empleados.' }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((employee) => ({
    id: employee.id,
    nombre: employee.nombre,
    apellido: employee.apellido ?? '',
    estado: employee.estado ? 'activo' : 'inactivo',
  })));
}
