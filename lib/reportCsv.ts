import type { ReportPeriod } from '@/lib/purchaseReport';

export type ReportRow = readonly [string, number];

function cell(value: string | number): string {
  const text = String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function reportCsv(rows: readonly ReportRow[], countLabel: string, period?: ReportPeriod): string {
  const header = ['Estado', countLabel, ...(period ? ['Desde', 'Hasta'] : [])];
  const records = rows.map(([label, count]) => [
    label, count, ...(period ? [period.from ?? '', period.to ?? ''] : []),
  ]);
  return '\uFEFF' + [header, ...records].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function downloadReportCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
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
