import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: (name) => name in mocks ? mocks[name] : require(name), console: { error() {} }, URL });
  return exports;
}

const purchases = load('../lib/purchases.ts');
const periods = load('../lib/purchaseReport.ts', { '@/lib/purchases': purchases });
const report = load('../lib/purchaseProductReport.ts', { '@/lib/purchaseReport': periods });
const validReport = {
  product_count: 2,
  page: 2,
  page_size: 25,
  items: [{
    product_id: 'cf7c2d6c-4970-44e1-a26e-f8c7e8b3cfaa',
    product_name: 'Producto',
    product_code: 'P-001',
    order_count: 2,
    line_count: 3,
    quantity_ordered: 20,
    quantity_received: 15,
    ordered_amount_gtq: '123456789012345.67',
    invalid_quantity_lines: 0,
    untrusted_amount_lines: 1,
  }],
};

test('product report validates exact amounts, quantity totals and row counts', () => {
  assert.equal(report.purchaseProductReportSchema.safeParse(validReport).success, true);
  assert.equal(report.purchaseProductReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], ordered_amount_gtq: '1.001' }],
  }).success, false);
  assert.equal(report.purchaseProductReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], quantity_received: 21 }],
  }).success, false);
  assert.equal(report.purchaseProductReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], untrusted_amount_lines: 4 }],
  }).success, false);
  assert.equal(report.purchaseProductReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], extra: true }],
  }).success, false);
});

test('endpoint enforces reports, purchases and inventory permissions and validates filters', async () => {
  let denied = 'reports';
  let rpcResult = { data: validReport, error: null };
  const calls = [];
  const { GET } = load('../app/api/informes/compras/productos/route.ts', {
    '@/lib/purchaseProductReport': report,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: { rpc: async (name, args) => { calls.push(['rpc', name, args]); return rpcResult; } } };
    } },
  });
  const request = (query = '') => new Request(`http://localhost/api/informes/compras/productos${query}`);
  assert.equal((await GET(request())).status, 403);
  denied = 'purchases'; calls.length = 0;
  assert.equal((await GET(request())).status, 403);
  denied = 'inventory'; calls.length = 0;
  assert.equal((await GET(request())).status, 403);
  denied = ''; calls.length = 0;

  for (const query of [
    '?from=2026-01-01', '?from=2026-02-30&to=2026-03-01',
    '?from=2026-02-01&to=2026-01-01', '?page=0', '?page=10001',
    '?page=1&page=2', '?unknown=1',
  ]) {
    assert.equal((await GET(request(query))).status, 400);
  }
  assert.equal(calls.some(([kind]) => kind === 'rpc'), false);
  calls.length = 0;

  const response = await GET(request('?from=2026-11-01&to=2026-11-30&page=2'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.items[0].ordered_amount_gtq, '123456789012345.67');
  assert.equal(body.page, 2);
  assert.deepEqual(calls.map((call) => call[1]), [
    'reports', 'purchases', 'inventory', 'purchase_product_report',
  ]);
  assert.equal(calls[3][2].p_start, '2026-11-01');
  assert.equal(calls[3][2].p_end, '2026-11-30');
  assert.equal(calls[3][2].p_page, 2);
  assert.equal(calls[3][2].p_page_size, 25);

  rpcResult = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: { ...validReport, items: [{ ...validReport.items[0], quantity_received: 21 }] }, error: null };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: { ...validReport, page: 1 }, error: null };
  assert.equal((await GET(request('?page=2'))).status, 500);
});
