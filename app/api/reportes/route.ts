import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { comprasService } from '@/lib/services/compras/comprasService';
import { supabaseAdmin } from '@/lib/db/supabase';

interface TotalRow {
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const tipo = request.nextUrl.searchParams.get('tipo') || 'resumen';
    const inicio = request.nextUrl.searchParams.get('inicio');
    const fin = request.nextUrl.searchParams.get('fin');

    const supabase = createClient();
    if (!supabaseAdmin) throw new Error('Admin client not available');
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if ((inicio && !validDate(inicio)) || (fin && !validDate(fin)) || (inicio && fin && inicio > fin)) {
      return NextResponse.json({ error: 'El rango de fechas no es válido.' }, { status: 400 });
    }

    const [clientes, proveedores, productos, ventas, compras, caja, asistencias] =
      await Promise.all([
        supabase.from('clientes').select('id').then((r) => r.data?.length || 0),
        supabase.from('proveedores').select('id').then((r) => r.data?.length || 0),
        supabase.from('inventario').select('id').then((r) => r.data?.length || 0),
        supabase.from('pos_orders').select('total').then((r) => r.data?.reduce((sum: number, v: TotalRow) => sum + v.total, 0) || 0),
        comprasService.getTotal(),
        supabaseAdmin.rpc('cash_movement_totals', { p_start: inicio || null, p_end: fin || null }).single(),
        supabaseAdmin.from('asistencia').select('id', { count: 'exact', head: true }),
      ]);
    if (caja.error) throw caja.error;
    if (asistencias.error) throw asistencias.error;
    if (asistencias.count === null) throw new Error('Attendance count unavailable');
    if (!caja.data || typeof caja.data !== 'object' || !('income' in caja.data) || !('expense' in caja.data)
      || (typeof caja.data.income !== 'number' && typeof caja.data.income !== 'string')
      || (typeof caja.data.expense !== 'number' && typeof caja.data.expense !== 'string')
      || !Number.isFinite(Number(caja.data.income)) || !Number.isFinite(Number(caja.data.expense))) {
      throw new Error('Invalid cash totals');
    }

    return NextResponse.json({
      tipo,
      periodo: `${inicio} a ${fin}`,
      total_ventas: ventas,
      total_compras: compras,
      total_ingresos_caja: Number(caja.data.income),
      total_egresos_caja: Number(caja.data.expense),
      total_clientes: clientes,
      total_proveedores: proveedores,
      total_productos: productos,
      total_asistencias: asistencias.count,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
