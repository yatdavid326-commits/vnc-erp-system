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

const lowStock = load('../lib/lowStock.ts');
const validReport = {
  total: 26,
  not_evaluated: 3,
  page: 2,
  page_size: 25,
  items: [{
    id: '7f1cf2ab-91ad-4850-a225-35605dc3203d',
    product_code: 'P1',
    name: 'Producto',
    quantity_on_hand: 2,
    reorder_level: 5,
  }],
};

test('low stock product pages validate limits, counts and inventory thresholds', () => {
  assert.equal(lowStock.lowStockProductsReportSchema.safeParse(validReport).success, true);
  assert.equal(lowStock.lowStockProductsReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], quantity_on_hand: 6 }],
  }).success, false);
  assert.equal(lowStock.lowStockProductsReportSchema.safeParse({
    ...validReport, page_size: 5,
  }).success, false);
  assert.equal(lowStock.lowStockProductsReportSchema.safeParse({
    ...validReport, total: 0,
  }).success, false);
  assert.equal(lowStock.lowStockProductsReportSchema.safeParse({
    ...validReport, items: [{ ...validReport.items[0], unexpected: true }],
  }).success, false);
});
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('low stock list applies dashboard rules, order and pagination', () => {
  const products = [
    { id: uuid(1), product_code: 'B', name: 'Bajo B', reorder_level: 5 },
    { id: uuid(2), product_code: 'A', name: 'Bajo A', reorder_level: 5 },
    { id: uuid(3), product_code: 'C', name: 'Suficiente', reorder_level: 5 },
    { id: uuid(4), product_code: 'D', name: 'Sin existencia registrada', reorder_level: 5 },
    { id: uuid(5), product_code: 'E', name: 'Sin nivel', reorder_level: null },
    { id: uuid(6), product_code: 'F', name: 'Existencia negativa', reorder_level: 5 },
    { id: uuid(7), product_code: 'G', name: 'Igual al nivel', reorder_level: '4' },
    { id: uuid(8), product_code: 'H', name: 'Cero', reorder_level: 0 },
  ];
  const inventory = [
    { product_id: uuid(1), quantity_on_hand: 2 }, { product_id: uuid(2), quantity_on_hand: 2 },
    { product_id: uuid(3), quantity_on_hand: 9 }, { product_id: uuid(5), quantity_on_hand: 1 },
    { product_id: uuid(6), quantity_on_hand: -1 }, { product_id: uuid(7), quantity_on_hand: '4' },
    { product_id: uuid(8), quantity_on_hand: 0 },
  ];
  const report = lowStock.buildLowStockProductsReport(products, inventory, 1, 25);
  assert.equal(report.total, 4);
  assert.equal(report.not_evaluated, 3);
  assert.deepEqual(Array.from(report.items, (item) => item.product_code), ['H', 'A', 'B', 'G']);
  assert.equal(report.items[3].reorder_level, 4);
  assert.equal(lowStock.lowStockProductsReportSchema.safeParse(report).success, true);

  const many = Array.from({ length: 30 }, (_, i) => ({ id: uuid(100 + i), product_code: `P${String(i).padStart(2, '0')}`, name: `P${i}`, reorder_level: 10 }));
  const manyStock = many.map((p) => ({ product_id: p.id, quantity_on_hand: 1 }));
  const second = lowStock.buildLowStockProductsReport(many, manyStock, 2, 25);
  assert.equal(second.total, 30);
  assert.deepEqual(Array.from(second.items, (item) => item.product_code), ['P25', 'P26', 'P27', 'P28', 'P29']);
  assert.equal(lowStock.buildLowStockProductsReport(many, manyStock, 3, 25).items.length, 0);
});

function fakeClient(tables, calls, failTable = '') {
  return {
    from(table) {
      const query = { filters: [] };
      const builder = {
        select(fields) { query.fields = fields; return builder; },
        eq(column, value) { query.filters.push([column, value]); return builder; },
        order(column) { query.order = column; return builder; },
        range(from, to) {
          calls.push(['from', table, query.fields, query.filters, query.order, from, to]);
          if (table === failTable) return Promise.resolve({ data: null, error: { message: 'database unavailable' } });
          const rows = tables[table].filter((row) => query.filters.every(([c, v]) => row[c] === v));
          return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
        },
      };
      return builder;
    },
  };
}

test('endpoint enforces reports and inventory access, validates pagination and reads all rows', async () => {
  let denied = 'reports';
  let failTable = '';
  const calls = [];
  const products = Array.from({ length: 1030 }, (_, i) => ({
    id: uuid(i + 1), product_code: `C${String(i).padStart(4, '0')}`, name: `Producto ${i}`, reorder_level: 5, is_active: i !== 0,
  }));
  const inventory = products.map((p, i) => ({ product_id: p.id, quantity_on_hand: i < 1005 ? 1 : 50 }));
  const { GET } = load('../app/api/inventario/bajo-stock/productos/route.ts', {
    '@/lib/lowStock': lowStock,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: fakeClient({ products, inventory }, calls, failTable) };
    } },
  });
  const request = (query = '') => new Request(`http://localhost/api/inventario/bajo-stock/productos${query}`);
  assert.equal((await GET(request())).status, 403);
  denied = 'inventory'; calls.length = 0;
  assert.equal((await GET(request())).status, 403);
  assert.equal(calls.some(([kind]) => kind === 'from'), false);
  denied = ''; calls.length = 0;
  for (const query of ['?page=0', '?page=10001', '?page=1&page=2', '?unknown=1', '?page=abc']) {
    assert.equal((await GET(request(query))).status, 400, query);
  }
  assert.equal(calls.some(([kind]) => kind === 'from'), false);

  calls.length = 0;
  const response = await GET(request('?page=41'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  // 1,004 productos activos con existencia 1 <= 5 (el primero está inactivo): página 41 tiene los últimos 4.
  assert.equal(body.total, 1004);
  assert.equal(body.not_evaluated, 0);
  assert.equal(body.page, 41);
  assert.deepEqual(body.items.map((item) => item.product_code), ['C1001', 'C1002', 'C1003', 'C1004']);
  const productCalls = calls.filter((call) => call[0] === 'from' && call[1] === 'products');
  assert.deepEqual(productCalls.map((call) => [call[5], call[6]]), [[0, 999], [1000, 1999]]);
  assert.deepEqual(Array.from(productCalls[0][3], (f) => Array.from(f)), [['is_active', true]]);
  assert.equal(calls.filter((call) => call[0] === 'from' && call[1] === 'inventory').length, 2);

  failTable = 'inventory';
  assert.equal((await GET(request())).status, 500);
  failTable = 'products';
  const failed = await GET(request());
  assert.equal(failed.status, 500);
  assert.match((await failed.json()).error, /No se pudo consultar/);
});
