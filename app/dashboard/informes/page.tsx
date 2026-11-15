'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useModuleStore } from '@/hooks';
import { fetchAuthenticatedBlob, fetchAuthenticatedJson } from '@/lib/services/auth/fetchAuthenticatedJson';
import { purchaseReportSchema, reportPeriodSchema, type PurchaseReport, type ReportPeriod } from '@/lib/purchaseReport';
import { inventoryReportSchema, type InventoryReport } from '@/lib/inventoryReport';
import { downloadReportBlob, downloadReportCsv, reportCsv } from '@/lib/reportCsv';

function PurchaseStatusReport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>({});
  const [report, setReport] = useState<PurchaseReport | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (period.from && period.to) {
          params.set('from', period.from);
          params.set('to', period.to);
        }
        const suffix = params.toString();
        const result = purchaseReportSchema.safeParse(await fetchAuthenticatedJson(`/api/informes/compras${suffix ? `?${suffix}` : ''}`));
        if (!result.success) throw new Error('El informe de compras recibido no es válido.');
        if (active) setReport(result.data);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'No se pudo consultar el informe de compras.');
      }
    }
    void load();
    return () => { active = false; };
  }, [period]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = reportPeriodSchema.safeParse({ from: from || undefined, to: to || undefined });
    if (!parsed.success) {
      setFormError('Indica ambas fechas válidas y en orden, o deja ambas vacías.');
      return;
    }
    setFormError(''); setError(''); setExportError(''); setReport(null); setPeriod(parsed.data);
  }

  function reset() {
    setFrom(''); setTo(''); setFormError(''); setError(''); setExportError(''); setReport(null); setPeriod({});
  }

  const rows = report && [
    ['Pendientes', report.pending],
    ['Parcialmente recibidas', report.partially_received],
    ['Recibidas', report.received],
    ['Anuladas', report.cancelled],
    ['Otros estados o sin estado', report.other],
    ['Total', report.total],
  ] as const;

  return <section className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold text-gray-900">Órdenes de compra por estado</h2>
    <p className="text-sm text-gray-600">El periodo usa la fecha de orden e incluye ambos días. No representa ventas ni pagos.</p>
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-gray-700">Desde
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded border border-gray-300 p-2" />
      </label>
      <label className="text-sm text-gray-700">Hasta
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block rounded border border-gray-300 p-2" />
      </label>
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Aplicar</button>
      <button type="button" onClick={reset} className="rounded border border-gray-300 px-4 py-2">Mostrar todo</button>
    </form>
    {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
    <p className="text-sm text-gray-600">
      Periodo consultado: {period.from && period.to ? `${period.from} a ${period.to}` : 'todas las fechas'}.
    </p>
    {rows && !error && <button type="button" className="rounded border border-gray-300 px-4 py-2" onClick={() => {
      setExportError('');
      try { downloadReportCsv('informe-compras.csv', reportCsv(rows, 'Órdenes', period)); }
      catch (error) { console.error('Purchase report export failed:', error); setExportError('No se pudo descargar el informe de compras.'); }
    }}>Descargar CSV de compras</button>}
    {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}
    {error ? <div role="alert" className="text-sm text-red-700">
      <p>{error}</p>
      <button type="button" className="underline" onClick={() => {
        setError(''); setReport(null); setPeriod({ ...period });
      }}>Reintentar</button>
    </div> : !report ? <p className="text-sm text-gray-600" aria-live="polite">Cargando informe...</p> :
      <table className="w-full max-w-lg text-left text-sm">
        <thead><tr><th className="py-2">Estado</th><th className="py-2">Órdenes</th></tr></thead>
        <tbody>{rows?.map(([label, amount]) => <tr key={label} className="border-t border-gray-200">
          <th scope="row" className="py-2 font-normal">{label}</th><td className="py-2">{amount}</td>
        </tr>)}</tbody>
      </table>}
  </section>;
}

function InventoryStatusReport() {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [exportError, setExportError] = useState('');
  const [detailExporting, setDetailExporting] = useState(false);
  const [detailExportError, setDetailExportError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = inventoryReportSchema.safeParse(await fetchAuthenticatedJson('/api/informes/inventario'));
        if (!result.success) throw new Error('El informe de inventario recibido no es válido.');
        if (active) setReport(result.data);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'No se pudo consultar el informe de inventario.');
      }
    }
    void load();
    return () => { active = false; };
  }, [revision]);

  function refresh() {
    setError(''); setExportError(''); setReport(null); setRevision((value) => value + 1);
  }

  async function exportDetails() {
    setDetailExportError('');
    setDetailExporting(true);
    try {
      const file = await fetchAuthenticatedBlob('/api/informes/inventario/detalle');
      downloadReportBlob('informe-inventario-detalle.csv', file);
    } catch (error) {
      console.error('Inventory detail export failed:', error);
      setDetailExportError(error instanceof Error ? error.message : 'No se pudo descargar el detalle del inventario.');
    } finally {
      setDetailExporting(false);
    }
  }

  const rows = report && [
    ['Con existencia física', report.positive],
    ['Sin existencia física', report.zero],
    ['Existencia física sin registrar', report.unregistered],
    ['Existencias o reservas inválidas', report.invalid],
    ['Total de productos activos', report.total],
  ] as const;

  return <section className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold text-gray-900">Estado del inventario</h2>
    <p className="text-sm text-gray-600">
      Productos activos al momento de la consulta. Sin existencia registrada se clasifican como sin registrar;
      si está registrada, las reservas deben estar registradas, ser no negativas y no superar la existencia.
      Las categorías con y sin existencia física solo incluyen registros válidos; no se descuentan reservas.
    </p>
    <button type="button" onClick={refresh} className="rounded border border-gray-300 px-4 py-2">Actualizar inventario</button>
    {rows && !error && <button type="button" className="rounded border border-gray-300 px-4 py-2" onClick={() => {
      setExportError('');
      try { downloadReportCsv('informe-inventario.csv', reportCsv(rows, 'Productos')); }
      catch (error) { console.error('Inventory report export failed:', error); setExportError('No se pudo descargar el informe de inventario.'); }
    }}>Descargar CSV de inventario</button>}
    <button type="button" disabled={!rows || !!error || detailExporting} className="rounded border border-gray-300 px-4 py-2 disabled:opacity-50" onClick={() => void exportDetails()}>
      {detailExporting ? 'Preparando detalle...' : 'Descargar detalle de productos activos'}
    </button>
    {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}
    {detailExportError && <p role="alert" className="text-sm text-red-700">{detailExportError}</p>}
    {error ? <div role="alert" className="text-sm text-red-700">
      <p>{error}</p>
      <button type="button" className="underline" onClick={refresh}>Reintentar</button>
    </div> : !report ? <p className="text-sm text-gray-600" aria-live="polite">Cargando inventario...</p> :
      <table className="w-full max-w-lg text-left text-sm">
        <thead><tr><th className="py-2">Estado</th><th className="py-2">Productos</th></tr></thead>
        <tbody>{rows?.map(([label, amount]) => <tr key={label} className="border-t border-gray-200">
          <th scope="row" className="py-2 font-normal">{label}</th><td className="py-2">{amount}</td>
        </tr>)}</tbody>
      </table>}
  </section>;
}

export default function InformesPage() {
  const canViewReports = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'reports' && item.module.is_active && item.can_view
  ));
  const canViewPurchases = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'purchases' && item.module.is_active && item.can_view
  ));
  const canViewInventory = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'inventory' && item.module.is_active && item.can_view
  ));

  return <div className="space-y-5">
    <h1 className="text-3xl font-bold text-gray-900">Informes</h1>
    {!canViewReports ? <p>Sin permiso para ver informes.</p> : <>
      {canViewPurchases ? <PurchaseStatusReport /> : <p>El informe de compras requiere permiso para ver Compras.</p>}
      {canViewInventory ? <InventoryStatusReport /> : <p>El informe de inventario requiere permiso para ver Inventario.</p>}
    </>}
    <p className="text-sm text-gray-600">Los demás informes están pendientes de implementación.</p>
  </div>;
}
