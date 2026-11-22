'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { fetchJson } from '@/lib/utils/fetchJson';
import type { ReportSummary } from '@/lib/utils/reportPdf';
import { useToast } from '@/components/notifications/ToastProvider';

export default function ReportesPage() {
  const { showToast } = useToast();
  const [reportes, setReportes] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: 'resumen',
    fechaInicio: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
  });
  const generarReporte = useCallback(async () => {
    try {
      const data = await fetchJson<ReportSummary | ReportSummary[]>(
        `/api/reportes?tipo=${filtros.tipo}&inicio=${filtros.fechaInicio}&fin=${filtros.fechaFin}`,
        'Error'
      );
      setReportes(Array.isArray(data) ? data : [data]);
      setError('');
      showToast('Reporte actualizado correctamente.', 'success');
    } catch (err) {
      showToast(
        'Error al generar el reporte: ' + (err instanceof Error ? err.message : ''),
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [filtros, showToast]);

  useEffect(() => {
    let active = true;
    const url = `/api/reportes?tipo=${filtros.tipo}&inicio=${filtros.fechaInicio}&fin=${filtros.fechaFin}`;
    fetchJson<ReportSummary | ReportSummary[]>(url, 'Error')
      .then((data) => {
        if (active) {
          setReportes(Array.isArray(data) ? data : [data]);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (active) setError('Error: ' + (err instanceof Error ? err.message : ''));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filtros]);

  const exportarPDF = async () => {
    setExportandoPDF(true);
    setError('');
    try {
      const { createReportPdf } = await import('@/lib/utils/reportPdf');
      const pdf = createReportPdf(reportes);
      pdf.save(
        `reporte-${filtros.tipo}-${filtros.fechaInicio}-${filtros.fechaFin}.pdf`
      );
      showToast('PDF generado y descargado.', 'success');
    } catch (exportError) {
      showToast(
        `No se pudo generar el PDF: ${
          exportError instanceof Error ? exportError.message : 'Error desconocido.'
        }`,
        'error'
      );
    } finally {
      setExportandoPDF(false);
    }
  };

  const enviarPorCorreo = async () => {
    const report = reportes[0];
    if (!report) return;

    setEnviandoCorreo(true);
    setError('');
    try {
      await fetchJson<{ success: boolean }>(
        '/api/reportes/email',
        'No se pudo enviar el reporte por correo.',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report }),
        }
      );
      showToast('Reporte enviado al correo de tu cuenta.', 'success');
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : 'No se pudo enviar el reporte por correo.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setEnviandoCorreo(false);
    }
  };

  return (
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
                disabled={exportandoPDF}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {exportandoPDF ? 'Generando PDF...' : '📄 Exportar PDF'}
              </button>
              <button
                onClick={enviarPorCorreo}
                disabled={enviandoCorreo || reportes.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {enviandoCorreo ? 'Enviando...' : 'Enviar PDF a mi correo'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              El PDF se enviará solo al correo de tu cuenta. El servicio
              requiere que SendGrid esté configurado.
            </p>
          </>
        )}
      </div>
    );
}



