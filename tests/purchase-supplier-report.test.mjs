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
const report = load('../lib/purchaseSupplierReport.ts');
const validReport = {
  supplier_count: 2,
  page: 2,
  page_size: 25,
  items: [{
    supplier_id: 'f299b1c2-0fc0-4c65-b23e-5a98b4b198ce',
    supplier_name: 'Proveedor',
    total_orders: 3,
    total_amount_gtq: '123456789012345.67',
    unvalued_amount_orders: 1,
  }],
};

test('supplier report validates exact amounts, order counts and page shape', () => {
  assert.equal(report.purchaseSupplierReportSchema.safeParse(validReport).success, true);
  assert.equal(report.purchaseSupplierReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], total_amount_gtq: '1.001' }],
  }).success, false);
  assert.equal(report.purchaseSupplierReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], unvalued_amount_orders: 4 }],
  }).success, false);
  assert.equal(report.purchaseSupplierReportSchema.safeParse({ ...validReport, page_size: 24 }).success, false);
});

test('endpoint enforces reports, purchases and supplier permissions and validates filters', async () => {
  let denied = 'reports';
  let rpcResult = { data: validReport, error: null };
  const calls = [];
  const { GET } = load('../app/api/informes/compras/proveedores/route.ts', {
    '@/lib/purchaseReport': periods,
    '@/lib/purchaseSupplierReport': report,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: { rpc: async (name, args) => { calls.push(['rpc', name, args]); return rpcResult; } } };
    } },
  });
  const request = (query = '') => new Request(`http://localhost/api/informes/compras/proveedores${query}`);
  assert.equal((await GET(request())).status, 403);
  denied = 'purchases'; calls.length = 0;
  assert.equal((await GET(request())).status, 403);
  denied = 'suppliers'; calls.length = 0;
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

  const response = await GET(request('?from=2026-01-01&to=2026-01-31&page=2'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.items[0].total_amount_gtq, '123456789012345.67');
  assert.equal(body.page, 2);
  assert.equal(body.page_size, 25);
  assert.deepEqual(calls.map((call) => call[1]), [
    'reports', 'purchases', 'suppliers', 'purchase_supplier_report',
  ]);
  assert.equal(calls[3][2].p_start, '2026-01-01');
  assert.equal(calls[3][2].p_end, '2026-01-31');
  assert.equal(calls[3][2].p_page, 2);
  assert.equal(calls[3][2].p_page_size, 25);

  rpcResult = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: { ...validReport, items: [{ ...validReport.items[0], total_amount_gtq: '1.001' }] }, error: null };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: { ...validReport, page: 1 }, error: null };
  assert.equal((await GET(request('?page=2'))).status, 500);
});
