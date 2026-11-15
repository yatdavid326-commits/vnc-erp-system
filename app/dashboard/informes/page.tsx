'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useModuleStore } from '@/hooks';
import { fetchAuthenticatedJson } from '@/lib/services/auth/fetchAuthenticatedJson';
import { purchaseReportSchema, reportPeriodSchema, type PurchaseReport, type ReportPeriod } from '@/lib/purchaseReport';

function PurchaseStatusReport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>({});
  const [report, setReport] = useState<PurchaseReport | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

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
    setFormError(''); setError(''); setReport(null); setPeriod(parsed.data);
  }

  function reset() {
    setFrom(''); setTo(''); setFormError(''); setError(''); setReport(null); setPeriod({});
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

export default function InformesPage() {
  const canViewReports = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'reports' && item.module.is_active && item.can_view
  ));
  const canViewPurchases = useModuleStore((state) => state.userModules.some(
    (item) => item.module?.name === 'purchases' && item.module.is_active && item.can_view
  ));

  return <div className="space-y-5">
    <h1 className="text-3xl font-bold text-gray-900">Informes</h1>
    {!canViewReports ? <p>Sin permiso para ver informes.</p> :
      !canViewPurchases ? <p>El informe de compras requiere permiso para ver Compras.</p> :
        <PurchaseStatusReport />}
    <p className="text-sm text-gray-600">Los demás informes están pendientes de implementación.</p>
  </div>;
}
