import assert from 'node:assert/strict';
import test from 'node:test';
import { createReportPdf } from '../lib/utils/reportPdf.ts';

const report = {
  tipo: 'resumen',
  periodo: '2026-10-22 a 2026-11-22',
  total_ventas: 1234.5,
  total_compras: 500,
  total_ingresos_caja: 2000,
  total_egresos_caja: 300,
  total_clientes: 12,
  total_proveedores: 5,
  total_productos: 34,
  total_asistencias: 67,
};

test('createReportPdf returns a real PDF document with a page per report', () => {
  const pdf = createReportPdf([report, { ...report, tipo: 'ventas' }]);
  const bytes = new Uint8Array(pdf.output('arraybuffer'));

  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  assert.equal(pdf.getNumberOfPages(), 2);
});
