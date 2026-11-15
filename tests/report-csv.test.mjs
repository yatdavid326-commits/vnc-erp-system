import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/reportCsv.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
runInNewContext(compiled, { exports });

test('CSV preserves counts and applied purchase period, including an unfiltered report', () => {
  const rows = [['Pendientes', 2], ['Total', 2]];
  assert.equal(exports.reportCsv(rows, 'Órdenes', { from: '2026-01-01', to: '2026-01-31' }),
    '\uFEFF"Estado","Órdenes","Desde","Hasta"\r\n"Pendientes","2","2026-01-01","2026-01-31"\r\n"Total","2","2026-01-01","2026-01-31"\r\n');
  assert.match(exports.reportCsv(rows, 'Órdenes', {}), /"Pendientes","2","",""/);
});

test('inventory CSV escapes text and prevents spreadsheet formula execution', () => {
  const csv = exports.reportCsv([['=HYPERLINK("x")', 3], ['Nombre, "especial"', 0], ['Total', 3]], 'Productos');
  assert.equal(csv, '\uFEFF"Estado","Productos"\r\n"\'=HYPERLINK(""x"")","3"\r\n"Nombre, ""especial""","0"\r\n"Total","3"\r\n');
  assert.match(exports.reportCsv([[' \t+1', 1]], 'Productos'), /"' \t\+1"/);
});

test('download uses a CSV blob and cleans up even if the click fails', async () => {
  const events = [];
  let shouldFail = false;
  const link = { click() { events.push('click'); if (shouldFail) throw new Error('download failed'); }, remove() { events.push('remove'); } };
  const browserExports = {};
  runInNewContext(compiled, {
    exports: browserExports, Blob,
    URL: { createObjectURL(blob) { events.push(blob); return 'blob:report'; }, revokeObjectURL(url) { events.push(url); } },
    document: { createElement: () => link, body: { appendChild: () => events.push('append') } },
    setTimeout: (callback) => callback(),
  });
  browserExports.downloadReportCsv('reporte.csv', '\uFEFFdata');
  assert.equal(link.download, 'reporte.csv');
  assert.equal(link.href, 'blob:report');
  assert.equal(events[0].type, 'text/csv;charset=utf-8');
  assert.deepEqual(Buffer.from(await events[0].arrayBuffer()), Buffer.from('\uFEFFdata'));
  assert.deepEqual(events.slice(1), ['append', 'click', 'remove', 'blob:report']);
  events.length = 0; shouldFail = true;
  assert.throws(() => browserExports.downloadReportCsv('reporte.csv', 'data'), /download failed/);
  assert.deepEqual(events.slice(1), ['append', 'click', 'remove', 'blob:report']);
});
