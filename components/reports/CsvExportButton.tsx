'use client';

import { useState } from 'react';

function getReportDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 1);
  const toDate = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  return { inicio: toDate(start), fin: toDate(end) };
}

export default function CsvExportButton() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const exportCsv = async () => {
    setExporting(true);
    setProgress('');
    setError('');
    try {
      const { generateAllModuleCsvZip } = await import('@/lib/utils/csvExport');
      const blob = await generateAllModuleCsvZip(
        { tipo: 'resumen', ...getReportDateRange() },
        ({ current, total, module }) => {
          setProgress(`${current}/${total}: ${module}`);
        }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `exportacion-csv-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'No se pudo completar la exportación CSV.'
      );
    } finally {
      setExporting(false);
      setProgress('');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={exportCsv}
        disabled={exporting}
        className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
      >
        {exporting ? `Exportando ${progress}` : 'Exportar CSV'}
      </button>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow"
        >
          {error}
        </p>
      )}
    </div>
  );
}
