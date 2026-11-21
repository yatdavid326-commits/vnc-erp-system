import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface TotalRow {
  total: number;
}

interface CashAmountRow {
  monto: number;
}

export async function GET(request: NextRequest) {
  try {
    const tipo = request.nextUrl.searchParams.get('tipo') || 'resumen';
    const inicio = request.nextUrl.searchParams.get('inicio');
    const fin = request.nextUrl.searchParams.get('fin');

    const supabase = createClient();

    const [clientes, proveedores, productos, ventas, compras, ingresos, egresos, asistencias] =
      await Promise.all([
        supabase.from('clientes').select('id').then((r) => r.data?.length || 0),
        supabase.from('proveedores').select('id').then((r) => r.data?.length || 0),
        supabase.from('inventario').select('id').then((r) => r.data?.length || 0),
        supabase.from('pos_orders').select('total').then((r) => r.data?.reduce((sum: number, v: TotalRow) => sum + v.total, 0) || 0),
        supabase.from('compras').select('total').then((r) => r.data?.reduce((sum: number, c: TotalRow) => sum + c.total, 0) || 0),
        supabase
          .from('cash_movements')
          .select('monto')
          .eq('tipo', 'ingreso')
          .then((r) => r.data?.reduce((sum: number, m: CashAmountRow) => sum + m.monto, 0) || 0),
        supabase
          .from('cash_movements')
          .select('monto')
          .eq('tipo', 'egreso')
          .then((r) => r.data?.reduce((sum: number, m: CashAmountRow) => sum + m.monto, 0) || 0),
        supabase.from('attendance').select('id').then((r) => r.data?.length || 0),
      ]);

    return NextResponse.json({
      tipo,
      periodo: `${inicio} a ${fin}`,
      total_ventas: ventas,
      total_compras: compras,
      total_ingresos_caja: ingresos,
      total_egresos_caja: egresos,
      total_clientes: clientes,
      total_proveedores: proveedores,
      total_productos: productos,
      total_asistencias: asistencias,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
