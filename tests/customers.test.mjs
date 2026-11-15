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

function authFixture({ profile = { id: 'profile-id', is_active: true }, access = { can_view: true, can_create: true, can_edit: true, can_delete: true }, profileError = null, accessError = null } = {}) {
  const filters = [];
  const client = {
    auth: { getUser: async (token) => ({ data: { user: token === 'valid' ? { id: 'auth-id' } : null }, error: null }) },
    from(table) {
      const query = {
        select() { return this; },
        eq(field, value) { filters.push([table, field, value]); return this; },
        async maybeSingle() { return table === 'user_profiles' ? { data: profile, error: profileError } : { data: access, error: accessError }; },
      };
      return query;
    },
  };
  const moduleAuth = load('../lib/services/modules/authorization.ts', { '@/lib/db/supabase': { supabaseAdmin: client } });
  return { ...load('../lib/services/customers/authorization.ts', { '@/lib/services/modules/authorization': moduleAuth }), authorizeModule: moduleAuth.authorizeModule, filters };
}
const request = (token, body) => new Request('http://localhost/api/clientes', {
  method: body === undefined ? 'GET' : 'POST',
  headers: token ? { authorization: `Bearer ${token}` } : {},
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('requires a valid session, active profile and operation-specific module permission', async () => {
  const fixture = authFixture();
  assert.equal((await fixture.authorizeCustomer(request(), 'can_view')).error.status, 401);
  assert.equal((await fixture.authorizeCustomer(request('invalid'), 'can_view')).error.status, 401);
  assert.equal((await authFixture({ profile: null }).authorizeCustomer(request('valid'), 'can_view')).error.status, 403);
  assert.equal((await authFixture({ profile: { id: 'p', is_active: false } }).authorizeCustomer(request('valid'), 'can_view')).error.status, 403);
  assert.equal((await authFixture({ access: null }).authorizeCustomer(request('valid'), 'can_view')).error.status, 403);
  assert.equal((await authFixture({ access: { can_view: false, can_create: true } }).authorizeCustomer(request('valid'), 'can_create')).error.status, 403);
  for (const permission of ['can_create', 'can_edit', 'can_delete']) {
    const access = { can_view: true, can_create: true, can_edit: true, can_delete: true, [permission]: false };
    assert.equal((await authFixture({ access }).authorizeCustomer(request('valid'), permission)).error.status, 403);
  }
  assert.ok((await fixture.authorizeCustomer(request('valid'), 'can_edit')).client);
  assert.ok(fixture.filters.some(([table, field, value]) => table === 'user_modules' && field === 'user_id' && value === 'profile-id'));
  assert.ok(fixture.filters.some(([table, field, value]) => table === 'user_modules' && field === 'module.is_active' && value === true));
  await fixture.authorizeModule(request('valid'), 'suppliers', 'can_create');
  assert.ok(fixture.filters.some(([table, field, value]) => table === 'user_modules' && field === 'module.name' && value === 'suppliers'));
});

test('surfaces permission lookup failures', async () => {
  assert.equal((await authFixture({ profileError: { message: 'database' } }).authorizeCustomer(request('valid'), 'can_view')).error.status, 500);
  assert.equal((await authFixture({ accessError: { message: 'database' } }).authorizeCustomer(request('valid'), 'can_view')).error.status, 500);
});

const customers = load('../lib/customers.ts');
const api = load('../lib/services/customers/customerApi.ts', { '@/lib/customers': customers });
const valid = { name: 'Cliente de prueba', email: '', phone: '', nit_number: '', address: '', city: '', country: '', customer_type: 'retail', is_active: true };

test('validates input and does not permit balance or arbitrary database fields', async () => {
  assert.equal((await api.readCustomer(request('valid', { ...valid, name: '  ' }))).error.status, 400);
  assert.equal((await api.readCustomer(request('valid', { ...valid, email: 'invalid' }))).error.status, 400);
  assert.equal((await api.readCustomer(request('valid', { ...valid, current_balance: 0 }))).error.status, 400);
  const result = await api.readCustomer(request('valid', { ...valid, name: '  Ana  ' }));
  assert.equal(result.data.name, 'Ana');
  assert.equal(result.data.nit_number, null);
});

test('filters the database before pagination and treats wildcard characters literally', async () => {
  const calls = [];
  const query = {
    select(...args) { calls.push(['select', ...args]); return this; },
    ilike(...args) { calls.push(['ilike', ...args]); return this; },
    eq(...args) { calls.push(['eq', ...args]); return this; },
    or(...args) { calls.push(['or', ...args]); return this; },
    order(...args) { calls.push(['order', ...args]); return this; },
    async range(...args) { calls.push(['range', ...args]); return { data: [], count: 0, error: null }; },
  };
  const { GET } = load('../app/api/clientes/route.ts', {
    '@/lib/services/customers/authorization': { authorizeCustomer: async () => ({ client: { from: () => query } }) },
    '@/lib/services/customers/customerApi': api,
  });
  let response = await GET(new Request('http://localhost/api/clientes?page=2&search=A%25_%5C&status=active'));
  assert.equal(response.status, 200);
  assert.deepEqual(calls.find(([name]) => name === 'ilike'), ['ilike', 'name', '%A\\%\\_\\\\%']);
  assert.deepEqual(calls.find(([name]) => name === 'eq'), ['eq', 'is_active', true]);
  assert.deepEqual(calls.find(([name]) => name === 'range'), ['range', 25, 49]);
  assert.ok(calls.findIndex(([name]) => name === 'ilike') < calls.findIndex(([name]) => name === 'range'));
  calls.length = 0;
  response = await GET(new Request('http://localhost/api/clientes?status=inactive'));
  assert.equal(response.status, 200);
  assert.deepEqual(calls.find(([name]) => name === 'or'), ['or', 'is_active.is.null,is_active.eq.false']);
  assert.equal((await GET(new Request('http://localhost/api/clientes?status=unknown'))).status, 400);
  assert.equal((await GET(new Request(`http://localhost/api/clientes?search=${'a'.repeat(101)}`))).status, 400);
});

test('CRUD routes enforce permissions, validate IDs and report database conflicts', async () => {
  let allowed = true;
  let operation = '';
  let databaseResult = { data: { id: '7f1cf2ab-91ad-4850-a225-35605dc3203d' }, error: null };
  const query = {
    select() { return this; }, insert() { operation = 'insert'; return this; },
    update() { operation = 'update'; return this; }, delete() { operation = 'delete'; return this; },
    eq() { return this; }, order() { return this; },
    async range() { operation = 'list'; return { data: [], count: 0, error: null }; },
    async single() { return databaseResult; }, async maybeSingle() { return databaseResult; },
  };
  const permissions = [];
  const mocks = {
    '@/lib/services/customers/authorization': { authorizeCustomer: async (_, permission) => {
      permissions.push(permission);
      return allowed ? { client: { from: () => query } } : { error: Response.json({ error: 'Forbidden' }, { status: 403 }) };
    } },
    '@/lib/services/customers/customerApi': api,
  };
  const collection = load('../app/api/clientes/route.ts', mocks);
  const item = load('../app/api/clientes/[id]/route.ts', mocks);
  const context = { params: Promise.resolve({ id: databaseResult.data.id }) };
  allowed = false;
  assert.equal((await collection.POST(request('valid', valid))).status, 403);
  assert.equal(operation, '');
  allowed = true;
  assert.equal((await collection.GET(request('valid'))).status, 200);
  assert.equal(operation, 'list');
  assert.equal((await collection.POST(request('valid', valid))).status, 201);
  assert.equal(operation, 'insert');
  assert.equal((await item.PUT(request('valid', valid), context)).status, 200);
  assert.equal(operation, 'update');
  assert.equal((await item.DELETE(request('valid'), context)).status, 200);
  assert.equal(operation, 'delete');
  assert.equal((await item.DELETE(request('valid'), { params: Promise.resolve({ id: 'invalid' }) })).status, 400);
  databaseResult = { data: null, error: null };
  assert.equal((await item.DELETE(request('valid'), context)).status, 404);
  databaseResult = { data: null, error: { code: '23505' } };
  assert.equal((await collection.POST(request('valid', valid))).status, 409);
  databaseResult = { data: null, error: { code: '23503' } };
  assert.equal((await item.DELETE(request('valid'), context)).status, 409);
  assert.deepEqual(permissions.slice(1, 5), ['can_view', 'can_create', 'can_edit', 'can_delete']);
});
