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
const report = load('../lib/inventoryMovementReport.ts', { '@/lib/purchaseReport': periods });
const validReport = {
  total_count: 2,
  page: 1,
  page_size: 25,
  items: [{
    id: 'f299b1c2-0fc0-4c65-b23e-5a98b4b198ce',
    product_id: 'cf7c2d6c-4970-44e1-a26e-f8c7e8b3cfaa',
    product_name: 'Producto',
    movement_type: 'entry',
    quantity: 3,
    reference_type: 'purchase',
    reference_id: '2216ae64-4595-4c75-a7a2-045b2618ae7d',
    notes: 'Recepcion de compra',
    created_by: 'e1522b26-92e7-48d3-83ea-0e0e1865c1f3',
    actor_name: 'Operador',
    created_at: '2026-11-15T10:00:00-06:00',
  }],
};

test('movement report validates rows, optional references and pagination shape', () => {
  assert.equal(report.inventoryMovementReportSchema.safeParse(validReport).success, true);
  assert.equal(report.inventoryMovementReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], quantity: 1.5 }],
  }).success, false);
  assert.equal(report.inventoryMovementReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], created_at: 'not-a-date' }],
  }).success, false);
  assert.equal(report.inventoryMovementReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], unexpected: true }],
  }).success, false);
  assert.equal(report.inventoryMovementReportSchema.safeParse({
    ...validReport, total_count: 0,
  }).success, false);
  assert.equal(report.inventoryMovementReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], reference_type: null, reference_id: null, created_by: null, actor_name: null, notes: null, created_at: null }],
  }).success, true);
});

test('endpoint enforces reports and inventory access and validates filters', async () => {
  let denied = 'reports';
  let rpcResult = { data: validReport, error: null };
  const calls = [];
  const { GET } = load('../app/api/informes/inventario/movimientos/route.ts', {
    '@/lib/inventoryMovementReport': report,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: { rpc: async (name, args) => { calls.push(['rpc', name, args]); return rpcResult; } } };
    } },
  });
  const request = (query = '') => new Request(`http://localhost/api/informes/inventario/movimientos${query}`);
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

  rpcResult = { data: { ...validReport, page: 2 }, error: null };
  const response = await GET(request('?from=2026-11-01&to=2026-11-30&page=2'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.items[0].product_name, 'Producto');
  assert.equal(body.page, 2);
  assert.deepEqual(calls.map((call) => call[1]), [
    'reports', 'inventory', 'inventory_movement_report',
  ]);
  assert.equal(calls[2][2].p_start, '2026-11-01');
  assert.equal(calls[2][2].p_end, '2026-11-30');
  assert.equal(calls[2][2].p_page, 2);
  assert.equal(calls[2][2].p_page_size, 25);

  rpcResult = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: { ...validReport, items: [{ ...validReport.items[0], quantity: 1.5 }] }, error: null };
  assert.equal((await GET(request())).status, 500);
  rpcResult = { data: { ...validReport, page: 1 }, error: null };
  assert.equal((await GET(request('?page=2'))).status, 500);
});
