'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Reporte {
  tipo: string;
  periodo: string;
  total_ventas: number;
  total_compras: number;
  total_ingresos_caja: number;
  total_egresos_caja: number;
  total_clientes: number;
  total_proveedores: number;
  total_productos: number;
  total_asistencias: number;
}

export default function ReportesPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    tipo: 'resumen',
    fechaInicio: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    generarReporte();
  }, [session, router]);

  const generarReporte = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reportes?tipo=${filtros.tipo}&inicio=${filtros.fechaInicio}&fin=${filtros.fechaFin}`
      );
      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setReportes(Array.isArray(data) ? data : [data]);
      setError('');
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    const contenido = reportes
      .map((r) => `
Reporte: ${r.tipo}
Período: ${r.periodo}
═══════════════════════════════════════
VENTAS: $${r.total_ventas.toFixed(2)}
COMPRAS: $${r.total_compras.toFixed(2)}
INGRESOS: $${r.total_ingresos_caja.toFixed(2)}
EGRESOS: $${r.total_egresos_caja.toFixed(2)}
CLIENTES: ${r.total_clientes}
PROVEEDORES: ${r.total_proveedores}
PRODUCTOS: ${r.total_productos}
ASISTENCIAS: ${r.total_asistencias}
`)
      .join('\n');

    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const exportarCSV = () => {
    let csv = 'Tipo,Periodo,Ventas,Compras,Ingresos,Egresos,Clientes,Proveedores,Productos,Asistencias\n';
    csv += reportes
      .map(
        (r) =>
          `${r.tipo},${r.periodo},${r.total_ventas},${r.total_compras},${r.total_ingresos_caja},${r.total_egresos_caja},${r.total_clientes},${r.total_proveedores},${r.total_productos},${r.total_asistencias}`
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Reportes</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Filtros</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Reporte</label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="resumen">Resumen General</option>
                <option value="ventas">Ventas</option>
                <option value="compras">Compras</option>
                <option value="inventario">Inventario</option>
                <option value="asistencia">Asistencia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Desde</label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hasta</label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generarReporte}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Generar
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : reportes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay datos para mostrar</div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600">Total Ventas</p>
                <p className="text-2xl font-bold text-blue-700">${reportes[0].total_ventas.toFixed(2)}</p>
              </div>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-600">Total Compras</p>
                <p className="text-2xl font-bold text-orange-700">${reportes[0].total_compras.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600">Total Ingresos</p>
                <p className="text-2xl font-bold text-green-700">${reportes[0].total_ingresos_caja.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">Total Egresos</p>
                <p className="text-2xl font-bold text-red-700">${reportes[0].total_egresos_caja.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-600">Total Clientes</p>
                <p className="text-2xl font-bold text-purple-700">{reportes[0].total_clientes}</p>
              </div>
              <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-4">
                <p className="text-sm text-cyan-600">Total Proveedores</p>
                <p className="text-2xl font-bold text-cyan-700">{reportes[0].total_proveedores}</p>
              </div>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-600">Total Productos</p>
                <p className="text-2xl font-bold text-yellow-700">{reportes[0].total_productos}</p>
              </div>
              <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4">
                <p className="text-sm text-pink-600">Total Asistencias</p>
                <p className="text-2xl font-bold text-pink-700">{reportes[0].total_asistencias}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportarPDF}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                📄 Exportar PDF
              </button>
              <button
                onClick={exportarCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                📊 Exportar CSV
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
