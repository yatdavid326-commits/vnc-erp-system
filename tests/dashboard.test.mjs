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
      if (name === '@/lib/db/supabase') return { supabase: {} };
      return require(name);
    },
  });
  return renderToStaticMarkup(createElement(exports.default));
}

test('dashboard identifies unavailable data and loads authorized summaries without invented figures', () => {
  const html = renderDashboard([
    { module: { name: 'inventory', is_active: true }, can_view: true },
    { module: { name: 'clients', is_active: true }, can_view: true },
  ]);
  assert.match(html, /Bienvenido, Usuario de prueba/);
  assert.match(html, /Algunas métricas todavía no están disponibles/);
  assert.match(html, /Cargando/);
  assert.match(html, /Existencia física registrada mayor que cero/);
  assert.match(html, /Clientes registrados con estado activo/);
  assert.equal((html.match(/Cargando/g) || []).length, 2);
  assert.equal((html.match(/No disponible/g) || []).length, 2);
  assert.equal((html.match(/Datos reales aún no disponibles/g) || []).length, 2);
  assert.doesNotMatch(html, /45,230|128,450|Factura #100|PRD-100/);
});

test('dashboard hides each summary independently when permission or module is inactive', () => {
  const html = renderDashboard([
    { module: { name: 'inventory', is_active: true }, can_view: false },
    { module: { name: 'clients', is_active: false }, can_view: true },
  ]);
  assert.equal((html.match(/Sin permiso/g) || []).length, 2);
  assert.doesNotMatch(html, /Existencia física registrada mayor que cero/);
  assert.doesNotMatch(html, /Clientes registrados con estado activo/);
  const inventoryOnly = renderDashboard([{ module: { name: 'inventory', is_active: true }, can_view: true }]);
  assert.match(inventoryOnly, /Existencia física registrada mayor que cero/);
  assert.equal((inventoryOnly.match(/Sin permiso/g) || []).length, 1);
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
