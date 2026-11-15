import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: (name) => name in mocks ? mocks[name] : require(name), URL, console: { error() {} } });
  return exports;
}

const purchases = load('../lib/purchases.ts');
const report = load('../lib/purchaseReport.ts', { '@/lib/purchases': purchases });
const inventoryReport = load('../lib/inventoryReport.ts');
const lowStock = load('../lib/lowStock.ts');
const valuation = load('../lib/inventoryValuationReport.ts');

test('period validation requires two real dates in order or no dates', () => {
  for (const valid of [{}, { from: '2024-02-29', to: '2024-02-29' }, { from: '2026-01-01', to: '2026-12-31' }]) {
    assert.equal(report.reportPeriodSchema.safeParse(valid).success, true);
  }
  for (const invalid of [{ from: '2026-01-01' }, { to: '2026-01-01' }, { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-12-31', to: '2026-01-01' }, { from: '', to: '' }]) {
    assert.equal(report.reportPeriodSchema.safeParse(invalid).success, false);
  }
});

test('report requires both permissions, validates dates and returns consistent counts', async () => {
  let denied = 'reports';
  let rpcResult = { data: {
    total: 4, pending: 1, partially_received: 1, received: 0, cancelled: 1, other: 1,
    total_amount_gtq: '136', pending_amount_gtq: '100.25', partially_received_amount_gtq: '5.50',
    received_amount_gtq: '0', cancelled_amount_gtq: '20.25', other_amount_gtq: '10',
    unvalued_amount_orders: 0,
  }, error: null };
  const calls = [];
  const { GET } = load('../app/api/informes/compras/route.ts', {
    '@/lib/purchaseReport': report,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: { rpc: async (name, args) => { calls.push(['rpc', name, args]); return rpcResult; } } };
    } },
  });
  const request = (query = '') => new Request(`http://localhost/api/informes/compras${query}`);
  assert.equal((await GET(request())).status, 403);
  assert.equal(calls.length, 1);
  denied = 'purchases'; calls.length = 0;
  assert.equal((await GET(request())).status, 403);
  assert.deepEqual(calls.map((call) => call[1]), ['reports', 'purchases']);
  denied = ''; calls.length = 0;
  for (const query of ['?from=2026-01-01', '?from=2026-02-30&to=2026-03-01',
    '?from=2026-02-01&to=2026-01-01', '?from=2026-01-01&from=2026-01-02&to=2026-01-03', '?unknown=1']) {
    assert.equal((await GET(request(query))).status, 400);
  }
  assert.equal(calls.some(([kind]) => kind === 'rpc'), false);
  calls.length = 0;
  const response = await GET(request('?from=2026-01-01&to=2026-01-31'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const parsedReport = await response.json();
  assert.equal(parsedReport.total, 4);
  assert.equal(parsedReport.total_amount_gtq, '136');
  assert.deepEqual(calls.map((call) => call[1]), ['reports', 'purchases', 'purchase_status_report']);
  assert.equal(calls[2][2].p_start, '2026-01-01');
  assert.equal(calls[2][2].p_end, '2026-01-31');
  rpcResult = { data: {
    total: 1, pending: 1, partially_received: 0, received: 0, cancelled: 0, other: 0,
    total_amount_gtq: '123456789012345.67', pending_amount_gtq: '123456789012345.67',
    partially_received_amount_gtq: '0', received_amount_gtq: '0', cancelled_amount_gtq: '0',
    other_amount_gtq: '0', unvalued_amount_orders: 0,
  }, error: null };
  const exactAmount = await (await GET(request())).json();
  assert.equal(exactAmount.total_amount_gtq, '123456789012345.67');
  calls.length = 0;
  rpcResult = { data: {
    total: 1, pending: 1, partially_received: 0, received: 0, cancelled: 0, other: 0,
    total_amount_gtq: '1.00', pending_amount_gtq: '0.99', partially_received_amount_gtq: '0',
    received_amount_gtq: '0', cancelled_amount_gtq: '0', other_amount_gtq: '0',
    unvalued_amount_orders: 0,
  }, error: null };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: {
    total: 1, pending: 1, partially_received: 0, received: 0, cancelled: 0, other: 0,
    total_amount_gtq: '1.001', pending_amount_gtq: '1.001', partially_received_amount_gtq: '0',
    received_amount_gtq: '0', cancelled_amount_gtq: '0', other_amount_gtq: '0',
    unvalued_amount_orders: 0,
  }, error: null };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: {
    total: 0, pending: 0, partially_received: 0, received: 0, cancelled: 0, other: 0,
    total_amount_gtq: '0', pending_amount_gtq: '0', partially_received_amount_gtq: '0',
    received_amount_gtq: '0', cancelled_amount_gtq: '0', other_amount_gtq: '0',
    unvalued_amount_orders: 0,
  }, error: null };
  assert.equal((await GET(request())).status, 200);
  assert.equal(calls[2][2].p_start, null);
  assert.equal(calls[2][2].p_end, null);
  rpcResult = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: { total: 0, pending: 1, partially_received: 0, received: 0, cancelled: 0, other: 0 }, error: null };
  assert.equal((await GET(request())).status, 500);
});

test('report page gates access independently for reports and purchases', () => {
  function render(userModules) {
    const { default: Page } = load('../app/dashboard/informes/page.tsx', {
      '@/hooks': { useModuleStore: (selector) => selector({ userModules }) },
      '@/lib/services/auth/fetchAuthenticatedJson': { fetchAuthenticatedJson: () => {}, fetchAuthenticatedBlob: () => {} },
      '@/lib/purchaseReport': report,
      '@/lib/inventoryReport': inventoryReport,
      '@/lib/lowStock': lowStock,
      '@/lib/inventoryValuationReport': valuation,
      '@/lib/reportCsv': { csvRecords() {}, downloadReportBlob() {}, downloadReportCsv() {}, reportCsv() {} },
    });
    return renderToStaticMarkup(createElement(Page));
  }
  const assignment = (name, can_view = true, is_active = true) => ({ can_view, module: { name, is_active } });
  assert.match(render([assignment('purchases')]), /Sin permiso para ver informes/);
  assert.match(render([assignment('reports')]), /requiere permiso para ver Compras/);
  assert.match(render([assignment('reports'), assignment('purchases', false)]), /requiere permiso para ver Compras/);
  assert.match(render([assignment('reports', true, false), assignment('purchases')]), /Sin permiso para ver informes/);
  const html = render([assignment('reports'), assignment('purchases')]);
  assert.match(html, /Cargando informe/);
  assert.match(html, /fecha de orden e incluye ambos días/);
  assert.match(html, /no el valor recibido ni lo pagado/);
  assert.match(html, /El informe de inventario requiere permiso para ver Inventario/);
  assert.match(html, /La valoración del inventario requiere permiso para ver Inventario/);
  assert.match(html, /El informe de bajo stock requiere permiso para ver Inventario/);
  assert.doesNotMatch(html, /Bajo stock/);
  const inventoryOnly = render([assignment('reports'), assignment('inventory')]);
  assert.match(inventoryOnly, /Cargando inventario/);
  assert.match(inventoryOnly, /Cargando valoración/);
  assert.match(inventoryOnly, /Valoración del inventario/);
  assert.match(inventoryOnly, /Cargando bajo stock/);
  assert.match(inventoryOnly, /Descargar detalle de productos activos/);
  assert.match(inventoryOnly, /El informe de compras requiere permiso para ver Compras/);
  assert.doesNotMatch(render([assignment('reports'), assignment('inventory', false)]), /Cargando bajo stock/);
  assert.doesNotMatch(render([assignment('reports'), assignment('inventory', false)]), /Cargando valoración/);
  assert.doesNotMatch(render([assignment('inventory')]), /Cargando inventario/);
});
