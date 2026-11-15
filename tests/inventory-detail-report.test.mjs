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
  runInNewContext(compiled, {
    exports,
    require: (name) => name in mocks ? mocks[name] : require(name),
    console: { error() {} },
  });
  return exports;
}

const detail = load('../lib/inventoryDetailReport.ts');
const csv = load('../lib/reportCsv.ts', {
  '@/lib/purchaseReport': { reportPeriodSchema: { optional: () => ({}) } },
});

function row(index, overrides = {}) {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    product_code: `P${index}`,
    name: `Producto ${index}`,
    unit_of_measure: 'unidad',
    cost_price: '10000000000.99',
    selling_price: '125.50',
    reorder_level: 5,
    quantity_on_hand: 2,
    quantity_reserved: 1,
    stock_status: 'positive',
    ...overrides,
  };
}

test('detail rows validate status, nullable stock values, and preserve decimal prices as text', () => {
  assert.equal(detail.inventoryDetailRowSchema.safeParse(row(1)).success, true);
  assert.equal(detail.inventoryDetailRowSchema.safeParse(row(2, {
    unit_of_measure: null, reorder_level: null, quantity_on_hand: null, quantity_reserved: null,
    stock_status: 'unregistered',
  })).success, true);
  assert.equal(detail.inventoryDetailRowSchema.safeParse(row(3, {
    quantity_on_hand: -1, quantity_reserved: -2, stock_status: 'invalid',
  })).success, true);
  assert.equal(detail.inventoryDetailRowSchema.safeParse(row(3, { cost_price: 100 })).success, false);
  assert.equal(detail.inventoryDetailRowSchema.safeParse(row(4, { stock_status: 'unknown' })).success, false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(detail.inventoryDetailCsvRow(row(5, { name: '=2+2', stock_status: 'positive' })))),
    ['P5', '=2+2', 'unidad', '10000000000.99', '125.50', 2, 1, 5, 'Con existencia'],
  );
});

test('detail route gates both reports and inventory permissions before querying', async () => {
  let denied = 'reports';
  const calls = [];
  const { GET } = load('../app/api/informes/inventario/detalle/route.ts', {
    '@/lib/inventoryDetailReport': detail,
    '@/lib/reportCsv': { csvRecords: csv.csvRecords },
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: { rpc: async () => { calls.push(['rpc']); return { data: [], error: null }; } } };
    } },
  });
  const request = new Request('http://localhost/api/informes/inventario/detalle');
  assert.equal((await GET(request)).status, 403);
  assert.deepEqual(calls, [['authorize', 'reports', 'can_view']]);
  denied = 'inventory'; calls.length = 0;
  assert.equal((await GET(request)).status, 403);
  assert.deepEqual(calls, [['authorize', 'reports', 'can_view'], ['authorize', 'inventory', 'can_view']]);
});

test('detail route pages in keyset order and returns escaped CSV with safe headers', async () => {
  let denied = '';
  const rows = Array.from({ length: 1002 }, (_, index) => row(index + 1));
  rows[0].name = '=2+2';
  const calls = [];
  const { GET } = load('../app/api/informes/inventario/detalle/route.ts', {
    '@/lib/inventoryDetailReport': detail,
    '@/lib/reportCsv': { csvRecords: csv.csvRecords },
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name) => name === denied
      ? { error: Response.json({}, { status: 403 }) }
      : { client: { rpc: async (name, args) => {
        calls.push([name, args]);
        const page = rows.filter((item) => !args.p_after_id || item.id > args.p_after_id).slice(0, args.p_limit);
        return { data: page, error: null };
      } } } },
  });
  const response = await GET(new Request('http://localhost/api/informes/inventario/detalle'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-disposition'), /informe-inventario-detalle\.csv/);
  assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].p_after_id, null);
  assert.equal(calls[0][1].p_limit, 1000);
  assert.equal(calls[1][1].p_after_id, rows[999].id);
  const content = Buffer.from(await response.arrayBuffer()).toString('utf8');
  assert.match(content, /^﻿"Código","Nombre","Unidad","Costo","Precio de venta"/);
  assert.match(content, /"P1","'=2\+2"/);
  assert.match(content, /"10000000000\.99"/);
  assert.match(content, /"P502","Producto 502"/);
});

test('detail route rejects out-of-order pages and RPC failures without returning partial CSV', async () => {
  let page = 0;
  let fail = false;
  const ordered = [row(1), row(2)];
  const { GET } = load('../app/api/informes/inventario/detalle/route.ts', {
    '@/lib/inventoryDetailReport': detail,
    '@/lib/reportCsv': { csvRecords: csv.csvRecords },
    '@/lib/services/modules/authorization': { authorizeModule: async () => ({
      client: { rpc: async () => {
        page++;
        if (fail && page === 2) return { data: null, error: { message: 'database unavailable' } };
        return { data: page === 1 ? Array.from({ length: 1000 }, (_, index) => row(index + 1)) : [ordered[0]], error: null };
      } },
    }) },
  });
  const request = new Request('http://localhost/api/informes/inventario/detalle');
  let response = await GET(request);
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /ordenado/);
  page = 0; fail = true;
  response = await GET(request);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'No se pudo consultar el detalle del inventario.');
});

test('detail route caps exports at 50,000 products without returning partial CSV', async () => {
  let calls = 0;
  const { GET } = load('../app/api/informes/inventario/detalle/route.ts', {
    '@/lib/inventoryDetailReport': detail,
    '@/lib/reportCsv': { csvRecords: csv.csvRecords },
    '@/lib/services/modules/authorization': { authorizeModule: async () => ({
      client: { rpc: async (_, args) => {
        calls++;
        const start = args.p_after_id ? Number(args.p_after_id.slice(-12)) + 1 : 1;
        return {
          data: Array.from({ length: args.p_limit }, (_, offset) => row(start + offset)),
          error: null,
        };
      } },
    }) },
  });
  const response = await GET(new Request('http://localhost/api/informes/inventario/detalle'));
  assert.equal(response.status, 413);
  assert.equal(calls, 51);
  assert.equal((await response.json()).error, 'El informe supera el límite de 50,000 productos activos.');
});
