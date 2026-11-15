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

const purchases = load('../lib/purchases.ts');
const id = '7f1cf2ab-91ad-4850-a225-35605dc3203d';
const valid = { id, number: 'OC-1', supplier_id: id, order_date: '2026-11-14', notes: '', items: [{ product_id: id, quantity: 2, unit_price: 1.25 }] };
const request = (body) => new Request('http://localhost/api/compras', { method: 'POST', body: JSON.stringify(body) });

test('purchase validation rejects invalid dates, products, prices and extra fields', () => {
  assert.equal(purchases.purchaseSchema.safeParse(valid).success, true);
  for (const candidate of [
    { ...valid, order_date: '2026-02-30' },
    { ...valid, order_date: '0000-01-01' },
    { ...valid, items: [] },
    { ...valid, items: [valid.items[0], valid.items[0]] },
    { ...valid, items: [{ ...valid.items[0], quantity: 0 }] },
    { ...valid, items: [{ ...valid.items[0], unit_price: 1.001 }] },
    { ...valid, created_by: id },
  ]) assert.equal(purchases.purchaseSchema.safeParse(candidate).success, false);
});

test('purchase list applies literal number and status filters before pagination', async () => {
  const calls = [];
  let allowed = true;
  const query = {
    select(...args) { calls.push(['select', ...args]); return this; },
    filter(...args) { calls.push(['filter', ...args]); return this; },
    eq(...args) { calls.push(['eq', ...args]); return this; },
    order(...args) { calls.push(['order', ...args]); return this; },
    async range(...args) { calls.push(['range', ...args]); return { data: [], count: 0, error: null }; },
  };
  const api = load('../app/api/compras/route.ts', {
    '@/lib/purchases': purchases,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return allowed ? { client: { from: () => query } } : { error: Response.json({}, { status: 403 }) };
    } },
  });
  const get = (params = '') => new Request(`http://localhost/api/compras${params}`);
  allowed = false;
  assert.equal((await api.GET(get())).status, 403);
  assert.deepEqual(calls.shift(), ['authorize', 'purchases', 'can_view']);
  allowed = true;
  for (const params of ['?page=0', '?status=unknown', `?search=${'a'.repeat(81)}`, '?search=a%00b']) {
    assert.equal((await api.GET(get(params))).status, 400);
  }
  assert.equal(calls.some(([name]) => name === 'select'), false);
  calls.length = 0;
  const params = new URLSearchParams({ page: '2', search: '  A%_*\\B  ', status: 'partially_received' });
  assert.equal((await api.GET(get(`?${params}`))).status, 200);
  assert.deepEqual(calls.find(([name]) => name === 'filter'), ['filter', 'po_number', 'imatch', 'A%_\\*\\\\B']);
  assert.deepEqual(calls.find(([name]) => name === 'eq'), ['eq', 'status', 'partially_received']);
  assert.deepEqual(calls.find(([name]) => name === 'range'), ['range', 25, 49]);
  calls.length = 0;
  assert.equal((await api.GET(get())).status, 200);
  assert.equal(calls.some(([name]) => name === 'filter' || name === 'eq'), false);
});

test('creation requires purchase permission and uses the server profile', async () => {
  let allowed = false;
  let rpcResult = { data: { already_recorded: false }, error: null };
  const calls = [];
  const api = load('../app/api/compras/route.ts', {
    '@/lib/purchases': purchases,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push([name, permission]);
      return allowed ? { profileId: 'server-profile', client: { rpc: async (name, args) => {
        calls.push([name, args]); return rpcResult;
      } } } : { error: Response.json({}, { status: 403 }) };
    } },
  });
  assert.equal((await api.POST(request(valid))).status, 403);
  allowed = true;
  assert.equal((await api.POST(request({ ...valid, items: [] }))).status, 400);
  assert.equal((await api.POST(request(valid))).status, 200);
  const rpc = calls.find(([name]) => name === 'create_purchase_order');
  assert.equal(rpc[1].p_actor, 'server-profile');
  assert.equal(rpc[1].p_id, id);
  assert.equal(calls[0][0], 'purchases');
  assert.equal(calls[0][1], 'can_create');
  rpcResult = { data: null, error: { code: '23505' } };
  assert.equal((await api.POST(request(valid))).status, 409);
  rpcResult = { data: null, error: { code: 'P0001', message: 'product_inactive' } };
  assert.equal((await api.POST(request(valid))).status, 409);
});

test('full receipt requires both module permissions and uses the authenticated actor', async () => {
  let denied = '';
  let rpcResult = { data: { already_recorded: false }, error: null };
  const calls = [];
  const api = load('../app/api/compras/[id]/recepcion/route.ts', {
    '@/lib/purchases': purchases,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push([name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { profileId: 'server-profile', client: { rpc: async (name, args) => {
          calls.push([name, args]); return rpcResult;
        } } };
    } },
  });
  const context = { params: Promise.resolve({ id }) };
  const receipt = { id, date: '2026-11-14' };
  denied = 'purchases';
  assert.equal((await api.POST(request(receipt), context)).status, 403);
  denied = 'inventory';
  assert.equal((await api.POST(request(receipt), context)).status, 403);
  assert.equal(calls.some(([name]) => name === 'receive_purchase_order'), false);
  denied = '';
  assert.equal((await api.POST(request({ ...receipt, date: '2026-02-30' }), context)).status, 400);
  assert.equal((await api.POST(request({ ...receipt, actor: id }), context)).status, 400);
  assert.equal((await api.POST(request(receipt), { params: Promise.resolve({ id: 'bad' }) })).status, 400);
  assert.equal((await api.POST(request(receipt), context)).status, 200);
  const rpc = calls.find(([name]) => name === 'receive_purchase_order');
  assert.equal(rpc[1].p_actor, 'server-profile');
  assert.equal(rpc[1].p_order_id, id);
  assert.equal(rpc[1].p_receipt_id, id);
  assert.ok(calls.some(([name, permission]) => name === 'purchases' && permission === 'can_edit'));
  assert.ok(calls.some(([name, permission]) => name === 'inventory' && permission === 'can_edit'));
  rpcResult = { data: null, error: { code: 'P0001', message: 'stock_uninitialized' } };
  assert.equal((await api.POST(request(receipt), context)).status, 409);
  rpcResult = { data: null, error: { code: 'P0001', message: 'order_missing' } };
  assert.equal((await api.POST(request(receipt), context)).status, 404);
});

test('partial receipt validates quantities and enforces both edit permissions', async () => {
  let denied = '';
  let rpcResult = { data: { already_recorded: false, complete: false }, error: null };
  const calls = [];
  const api = load('../app/api/compras/[id]/recepcion-parcial/route.ts', {
    '@/lib/purchases': purchases,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push([name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { profileId: 'server-profile', client: { rpc: async (name, args) => {
          calls.push([name, args]); return rpcResult;
        } } };
    } },
  });

  const context = { params: Promise.resolve({ id }) };
  const receipt = { id, date: '2026-11-14', items: [{ item_id: id, quantity: 2 }] };
  denied = 'purchases';
  assert.equal((await api.POST(request(receipt), context)).status, 403);
  denied = 'inventory';
  assert.equal((await api.POST(request(receipt), context)).status, 403);
  assert.equal(calls.some(([name]) => name === 'receive_partial_purchase_order'), false);
  denied = '';
  for (const invalid of [
    { ...receipt, date: '2026-02-30' },
    { ...receipt, items: [] },
    { ...receipt, items: [{ item_id: id, quantity: 0 }] },
    { ...receipt, items: [{ item_id: id, quantity: 1.5 }] },
    { ...receipt, items: [receipt.items[0], receipt.items[0]] },
    { ...receipt, actor: id },
  ]) assert.equal((await api.POST(request(invalid), context)).status, 400);
  assert.equal((await api.POST(request(receipt), context)).status, 200);
  const rpc = calls.find(([name]) => name === 'receive_partial_purchase_order');
  assert.equal(rpc[1].p_actor, 'server-profile');
  assert.equal(rpc[1].p_order_id, id);
  assert.equal(rpc[1].p_items[0].quantity, 2);
  rpcResult = { data: null, error: { code: 'P0001', message: 'quantity_exceeded' } };
  assert.equal((await api.POST(request(receipt), context)).status, 409);
  rpcResult = { data: null, error: { code: 'P0001', message: 'order_missing' } };
  assert.equal((await api.POST(request(receipt), context)).status, 404);
});

test('cancellation requires edit permission and uses the authenticated actor', async () => {
  let allowed = false;
  let rpcResult = { data: { already_cancelled: false }, error: null };
  const calls = [];
  const api = load('../app/api/compras/[id]/anulacion/route.ts', {
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push([name, permission]);
      return allowed ? { profileId: 'server-profile', client: { rpc: async (name, args) => {
        calls.push([name, args]); return rpcResult;
      } } } : { error: Response.json({}, { status: 403 }) };
    } },
  });
  const context = { params: Promise.resolve({ id }) };
  assert.equal((await api.POST(request({}), context)).status, 403);
  assert.deepEqual(calls[0], ['purchases', 'can_edit']);
  allowed = true;
  assert.equal((await api.POST(request({}), { params: Promise.resolve({ id: 'bad' }) })).status, 400);
  assert.equal((await api.POST(request({ actor: id }), context)).status, 200);
  const rpc = calls.find(([name]) => name === 'cancel_pending_purchase_order');
  assert.equal(rpc[1].p_actor, 'server-profile');
  assert.equal(rpc[1].p_order_id, id);
  rpcResult = { data: null, error: { code: 'P0001', message: 'order_not_cancellable' } };
  assert.equal((await api.POST(request({}), context)).status, 409);
  rpcResult = { data: null, error: { code: 'P0001', message: 'order_missing' } };
  assert.equal((await api.POST(request({}), context)).status, 404);
});

test('editing order details validates input, requires permission and detects conflicts', async () => {
  let allowed = false;
  let rpcResult = { data: { edit_version: 1 }, error: null };
  const calls = [];
  const api = load('../app/api/compras/[id]/detalles/route.ts', {
    '@/lib/purchases': purchases,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push([name, permission]);
      return allowed ? { profileId: 'server-profile', client: { rpc: async (name, args) => {
        calls.push([name, args]); return rpcResult;
      } } } : { error: Response.json({}, { status: 403 }) };
    } },
  });
  const context = { params: Promise.resolve({ id }) };
  const body = { order_date: '2026-11-14', notes: '  Test  ', edit_version: 0 };
  assert.equal((await api.PATCH(request(body), context)).status, 403);
  assert.deepEqual(calls[0], ['purchases', 'can_edit']);
  allowed = true;
  assert.equal((await api.PATCH(request(body), { params: Promise.resolve({ id: 'bad' }) })).status, 400);
  for (const invalid of [
    { ...body, order_date: '2026-02-30' },
    { ...body, notes: 'x'.repeat(501) },
    { ...body, edit_version: -1 },
    { ...body, edit_version: 0.5 },
    { ...body, actor: id },
  ]) assert.equal((await api.PATCH(request(invalid), context)).status, 400);
  assert.equal((await api.PATCH(request(body), context)).status, 200);
  const rpc = calls.find(([name]) => name === 'edit_pending_purchase_details');
  assert.equal(rpc[1].p_actor, 'server-profile');
  assert.equal(rpc[1].p_order_id, id);
  assert.equal(rpc[1].p_notes, 'Test');
  assert.equal(rpc[1].p_version, 0);
  rpcResult = { data: null, error: { code: 'P0001', message: 'order_changed' } };
  assert.equal((await api.PATCH(request(body), context)).status, 409);
  rpcResult = { data: null, error: { code: 'P0001', message: 'order_missing' } };
  assert.equal((await api.PATCH(request(body), context)).status, 404);
});
