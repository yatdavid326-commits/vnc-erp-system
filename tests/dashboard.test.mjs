import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';

const source = readFileSync(new URL('../app/dashboard/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const require = createRequire(import.meta.url);
const lowStockSource = readFileSync(new URL('../lib/lowStock.ts', import.meta.url), 'utf8');
const lowStockCompiled = ts.transpileModule(lowStockSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const lowStock = {};
runInNewContext(lowStockCompiled, { exports: lowStock, require });
const purchaseSource = readFileSync(new URL('../lib/purchases.ts', import.meta.url), 'utf8');
const purchaseCompiled = ts.transpileModule(purchaseSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const purchases = {};
runInNewContext(purchaseCompiled, { exports: purchases, require });

function renderDashboard(userModules) {
  const exports = {};
  const require = createRequire(import.meta.url);
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === '@/hooks') return {
        useAuthStore: () => ({ user: { full_name: 'Usuario de prueba' } }),
        useModuleStore: (selector) => selector({ userModules }),
      };
      if (name === '@/lib/services/auth/fetchAuthenticatedJson') return { fetchAuthenticatedJson: () => {} };
      if (name === '@/lib/lowStock') return lowStock;
      if (name === '@/lib/purchases') return purchases;
      return require(name);
    },
  });
  return renderToStaticMarkup(createElement(exports.default));
}

test('dashboard identifies unavailable data and loads authorized summaries without invented figures', () => {
  const html = renderDashboard([
    { module: { name: 'inventory', is_active: true }, can_view: true },
    { module: { name: 'clients', is_active: true }, can_view: true },
    { module: { name: 'purchases', is_active: true }, can_view: true },
  ]);
  assert.match(html, /Bienvenido, Usuario de prueba/);
  assert.match(html, /Algunas métricas todavía no están disponibles/);
  assert.match(html, /Cargando/);
  assert.match(html, /Existencia física registrada mayor que cero/);
  assert.match(html, /Clientes registrados con estado activo/);
  assert.equal((html.match(/Cargando/g) || []).length, 4);
  assert.equal((html.match(/No disponible/g) || []).length, 2);
  assert.equal((html.match(/Datos reales aún no disponibles/g) || []).length, 1);
  assert.match(html, /Ventas Recientes<\/h2><p[^>]*>Datos reales aún no disponibles/);
  assert.match(html, /Productos con Bajo Stock<\/h2><p[^>]*>Cargando/);
  assert.match(html, /Órdenes de compra recientes<\/h2><p[^>]*>Cargando/);
  assert.doesNotMatch(html, /45,230|128,450|Factura #100|PRD-100/);
});

test('dashboard hides each summary independently when permission or module is inactive', () => {
  const html = renderDashboard([
    { module: { name: 'inventory', is_active: true }, can_view: false },
    { module: { name: 'clients', is_active: false }, can_view: true },
  ]);
  assert.equal((html.match(/Sin permiso/g) || []).length, 4);
  assert.doesNotMatch(html, /Existencia física registrada mayor que cero/);
  assert.doesNotMatch(html, /Clientes registrados con estado activo/);
  const inventoryOnly = renderDashboard([{ module: { name: 'inventory', is_active: true }, can_view: true }]);
  assert.match(inventoryOnly, /Existencia física registrada mayor que cero/);
  assert.equal((inventoryOnly.match(/Sin permiso/g) || []).length, 2);
  const purchasesOnly = renderDashboard([{ module: { name: 'purchases', is_active: true }, can_view: true }]);
  assert.match(purchasesOnly, /Órdenes de compra recientes<\/h2><p[^>]*>Cargando/);
});

test('recent orders require purchase access and query only the five latest orders', async () => {
  const apiSource = readFileSync(new URL('../app/api/compras/recientes/route.ts', import.meta.url), 'utf8');
  const apiCompiled = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [];
  let allowed = false;
  const order = { id: '7f1cf2ab-91ad-4850-a225-35605dc3203d', po_number: 'OC-1', order_date: '2026-11-15', status: 'pending' };
  let result = { data: [order], error: null };
  const query = {
    select(...args) { calls.push(['select', ...args]); return this; },
    order(...args) { calls.push(['order', ...args]); return this; },
    async limit(...args) { calls.push(['limit', ...args]); return result; },
  };
  const exports = {};
  runInNewContext(apiCompiled, { exports, console: { error() {} }, require: (name) => {
    if (name === '@/lib/services/modules/authorization') return {
      authorizeModule: async (_, module, permission) => {
        calls.push(['authorize', module, permission]);
        return allowed ? { client: { from: (table) => { calls.push(['from', table]); return query; } } }
          : { error: Response.json({}, { status: 403 }) };
      },
    };
    if (name === '@/lib/purchases') return purchases;
    return require(name);
  } });
  const request = new Request('http://localhost/api/compras/recientes');
  assert.equal((await exports.GET(request)).status, 403);
  assert.equal(calls.length, 1);
  allowed = true;
  const response = await exports.GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await response.json()).items, [order]);
  assert.deepEqual(calls[1], ['authorize', 'purchases', 'can_view']);
  assert.deepEqual(calls[2], ['from', 'purchase_orders']);
  assert.deepEqual(calls[3], ['select', 'id, po_number, order_date, status']);
  assert.equal(calls[4][1], 'created_at');
  assert.equal(calls[4][2].ascending, false);
  assert.equal(calls[4][2].nullsFirst, false);
  assert.equal(calls[5][1], 'id');
  assert.equal(calls[5][2].ascending, false);
  assert.deepEqual(calls[6], ['limit', 5]);
  result = { data: [], error: null };
  assert.deepEqual((await (await exports.GET(request)).json()).items, []);
  result = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await exports.GET(request)).status, 500);
  result = { data: [{ ...order, status: 42 }], error: null };
  assert.equal((await exports.GET(request)).status, 500);
});

test('purchase state labels preserve known and legacy states', () => {
  assert.equal(purchases.purchaseStatusLabel('pending'), 'Pendiente');
  assert.equal(purchases.purchaseStatusLabel('partially_received'), 'Parcialmente recibida');
  assert.equal(purchases.purchaseStatusLabel('received'), 'Recibida');
  assert.equal(purchases.purchaseStatusLabel('cancelled'), 'Anulada');
  assert.equal(purchases.purchaseStatusLabel(null), 'Sin estado');
  assert.equal(purchases.purchaseStatusLabel('legacy'), 'legacy');
});

test('low stock route denies access and validates the database result', async () => {
  const apiSource = readFileSync(new URL('../app/api/inventario/bajo-stock/route.ts', import.meta.url), 'utf8');
  const apiCompiled = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [];
  let allowed = false;
  let result = { data: { total: 0, not_evaluated: 2, items: [] }, error: null };
  const exports = {};
  runInNewContext(apiCompiled, { exports, console: { error() {} }, require: (name) => {
    if (name === '@/lib/services/modules/authorization') return {
      authorizeModule: async (_, module, permission) => {
        calls.push(['authorize', module, permission]);
        return allowed ? { client: { rpc: async (method) => { calls.push(['rpc', method]); return result; } } }
          : { error: Response.json({}, { status: 403 }) };
      },
    };
    if (name === '@/lib/lowStock') return lowStock;
    return require(name);
  } });
  const request = new Request('http://localhost/api/inventario/bajo-stock');
  assert.equal((await exports.GET(request)).status, 403);
  assert.equal(calls.length, 1);
  allowed = true;
  const response = await exports.GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).not_evaluated, 2);
  assert.deepEqual(calls[1], ['authorize', 'inventory', 'can_view']);
  assert.deepEqual(calls[2], ['rpc', 'dashboard_low_stock']);
  result = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await exports.GET(request)).status, 500);
  result = { data: { total: 1, not_evaluated: 0, items: [] }, error: null };
  assert.equal((await exports.GET(request)).status, 500);
});

test('low stock data rejects inconsistent counts and quantities above the threshold', () => {
  const item = { id: '7f1cf2ab-91ad-4850-a225-35605dc3203d', product_code: 'P1', name: 'Producto', quantity_on_hand: 2, reorder_level: 2 };
  assert.equal(lowStock.lowStockSchema.safeParse({ total: 1, not_evaluated: 0, items: [item] }).success, true);
  assert.equal(lowStock.lowStockSchema.safeParse({ total: 0, not_evaluated: 0, items: [item] }).success, false);
  assert.equal(lowStock.lowStockSchema.safeParse({ total: 1, not_evaluated: 0, items: [{ ...item, quantity_on_hand: 3 }] }).success, false);
  assert.equal(lowStock.lowStockSchema.safeParse({ total: 1, not_evaluated: -1, items: [item] }).success, false);
});

test('customer summary requires permission and counts only active customers without pagination', async () => {
  const require = createRequire(import.meta.url);
  const apiSource = readFileSync(new URL('../app/api/clientes/resumen/route.ts', import.meta.url), 'utf8');
  const apiCompiled = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [];
  let allowed = false;
  let result = { count: 32, error: null };
  const query = {
    select(...args) { calls.push(['select', ...args]); return this; },
    async eq(...args) { calls.push(['eq', ...args]); return result; },
  };
  const exports = {};
  runInNewContext(apiCompiled, { exports, console: { error() {} }, require: (name) => {
    if (name === '@/lib/services/customers/authorization') return {
      authorizeCustomer: async (_, permission) => {
        calls.push(['authorize', permission]);
        return allowed ? { client: { from: (table) => { calls.push(['from', table]); return query; } } }
          : { error: Response.json({}, { status: 403 }) };
      },
    };
    return require(name);
  } });
  const request = new Request('http://localhost/api/clientes/resumen');
  assert.equal((await exports.GET(request)).status, 403);
  assert.equal(calls.length, 1);
  allowed = true;
  calls.length = 0;
  const response = await exports.GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).active_customers, 32);
  assert.deepEqual(calls[0], ['authorize', 'can_view']);
  assert.deepEqual(calls[1], ['from', 'customers']);
  assert.equal(calls[2][1], 'id');
  assert.equal(calls[2][2].count, 'exact');
  assert.equal(calls[2][2].head, true);
  assert.deepEqual(calls[3], ['eq', 'is_active', true]);
  result = { count: 0, error: null };
  assert.equal((await (await exports.GET(request)).json()).active_customers, 0);
  result = { count: null, error: null };
  assert.equal((await exports.GET(request)).status, 500);
  result = { count: null, error: { message: 'database unavailable' } };
  assert.equal((await exports.GET(request)).status, 500);
});

test('inventory summary requires permission and counts all active products with positive physical stock', async () => {
  const require = createRequire(import.meta.url);
  const apiSource = readFileSync(new URL('../app/api/inventario/resumen/route.ts', import.meta.url), 'utf8');
  const apiCompiled = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const calls = [];
  let allowed = false;
  let result = { count: 32, error: null };
  const query = {
    select(...args) { calls.push(['select', ...args]); return this; },
    eq(...args) { calls.push(['eq', ...args]); return this; },
    async gt(...args) { calls.push(['gt', ...args]); return result; },
  };
  const exports = {};
  runInNewContext(apiCompiled, { exports, console: { error() {} }, require: (name) => {
    if (name === '@/lib/services/modules/authorization') return {
      authorizeModule: async (_, module, permission) => {
        calls.push(['authorize', module, permission]);
        return allowed ? { client: { from: (table) => { calls.push(['from', table]); return query; } } }
          : { error: Response.json({}, { status: 403 }) };
      },
    };
    return require(name);
  } });
  const request = new Request('http://localhost/api/inventario/resumen');
  assert.equal((await exports.GET(request)).status, 403);
  assert.equal(calls.length, 1);
  allowed = true;
  calls.length = 0;
  const response = await exports.GET(request);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).products_in_stock, 32);
  assert.deepEqual(calls[0], ['authorize', 'inventory', 'can_view']);
  assert.deepEqual(calls[1], ['from', 'inventory']);
  assert.equal(calls[2][1], 'product_id, products!inner(id)');
  assert.equal(calls[2][2].count, 'exact');
  assert.equal(calls[2][2].head, true);
  assert.deepEqual(calls[3], ['eq', 'products.is_active', true]);
  assert.deepEqual(calls[4], ['gt', 'quantity_on_hand', 0]);
  result = { count: 0, error: null };
  assert.equal((await (await exports.GET(request)).json()).products_in_stock, 0);
  result = { count: null, error: null };
  assert.equal((await exports.GET(request)).status, 500);
  result = { count: null, error: { message: 'database unavailable' } };
  assert.equal((await exports.GET(request)).status, 500);
});
