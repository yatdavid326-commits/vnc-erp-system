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
  runInNewContext(compiled, { exports, require: (name) => name in mocks ? mocks[name] : require(name), console, URL, Date });
  return exports;
}

const products = load('../lib/products.ts');
const api = load('../lib/services/inventory/productApi.ts', { '@/lib/products': products });
const valid = { product_code: 'P1', name: 'Producto', description: '', unit_of_measure: 'unidad', cost_price: 1.15, selling_price: 2.50, reorder_level: 10, is_active: true };
const request = (body) => new Request('http://localhost/api/inventario', {
  method: body === undefined ? 'GET' : 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('validates prices and rejects direct stock changes', async () => {
  assert.equal((await api.readProduct(request({ ...valid, name: ' ' }))).error.status, 400);
  assert.equal((await api.readProduct(request({ ...valid, cost_price: -1 }))).error.status, 400);
  assert.equal((await api.readProduct(request({ ...valid, selling_price: 1.001 }))).error.status, 400);
  assert.equal((await api.readProduct(request({ ...valid, selling_price: 10000000000 }))).error.status, 400);
  assert.equal((await api.readProduct(request({ ...valid, reorder_level: 1.5 }))).error.status, 400);
  assert.equal((await api.readProduct(request({ ...valid, quantity_on_hand: 100 }))).error.status, 400);
  const result = await api.readProduct(request({ ...valid, name: '  Ana  ' }));
  assert.equal(result.data.name, 'Ana');
  assert.equal(result.data.description, null);
});

test('product routes enforce inventory permissions and report conflicts', async () => {
  let allowed = true;
  let operation = '';
  let result = { data: { id: '7f1cf2ab-91ad-4850-a225-35605dc3203d' }, error: null };
  const permissions = [];
  const query = {
    select() { return this; }, insert() { operation = 'insert'; return this; },
    update() { operation = 'update'; return this; }, delete() { operation = 'delete'; return this; },
    eq() { return this; }, order() { return this; },
    async range() { operation = 'list'; return { data: [], count: 0, error: null }; },
    async single() { return result; }, async maybeSingle() { return result; },
  };
  const mocks = {
    '@/lib/services/modules/authorization': { authorizeModule: async (_, module, permission) => {
      permissions.push([module, permission]);
      return allowed ? { client: { from: () => query } } : { error: Response.json({}, { status: 403 }) };
    } },
    '@/lib/services/inventory/productApi': api,
  };
  const collection = load('../app/api/inventario/route.ts', mocks);
  const item = load('../app/api/inventario/[id]/route.ts', mocks);
  const context = { params: Promise.resolve({ id: result.data.id }) };
  allowed = false;
  assert.equal((await collection.POST(request(valid))).status, 403);
  assert.equal(operation, '');
  allowed = true;
  assert.equal((await collection.GET(request())).status, 200);
  assert.equal((await collection.POST(request(valid))).status, 201);
  assert.equal((await item.PUT(request(valid), context)).status, 200);
  assert.equal((await item.DELETE(request(), context)).status, 200);
  assert.deepEqual(permissions.slice(1, 5), [
    ['inventory', 'can_view'], ['inventory', 'can_create'], ['inventory', 'can_edit'], ['inventory', 'can_delete'],
  ]);
  assert.equal((await item.DELETE(request(), { params: Promise.resolve({ id: 'bad' }) })).status, 400);
  result = { data: null, error: null };
  assert.equal((await item.PUT(request(valid), context)).status, 404);
  result = { data: null, error: { code: '23505' } };
  assert.equal((await collection.POST(request(valid))).status, 409);
  result = { data: null, error: { code: '23503' } };
  assert.equal((await item.DELETE(request(), context)).status, 409);
});
