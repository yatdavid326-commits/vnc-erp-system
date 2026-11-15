import type { ReportPeriod } from '@/lib/purchaseReport';

export type ReportRow = readonly [string, number];

export type CsvValue = string | number;

function cell(value: string | number): string {
  const text = String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvRecords(header: readonly CsvValue[], rows: readonly (readonly CsvValue[])[]): string {
  if (rows.some((row) => row.length !== header.length)) {
    throw new Error('CSV rows must match the header column count.');
  }
  return '\uFEFF' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function reportCsv(rows: readonly ReportRow[], countLabel: string, period?: ReportPeriod): string {
  const header = ['Estado', countLabel, ...(period ? ['Desde', 'Hasta'] : [])];
  const records = rows.map(([label, count]) => [
    label, count, ...(period ? [period.from ?? '', period.to ?? ''] : []),
  ]);
  return csvRecords(header, records);
}

export function downloadReportBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function downloadReportCsv(filename: string, content: string): void {
  downloadReportBlob(filename, new Blob([content], { type: 'text/csv;charset=utf-8' }));
}
