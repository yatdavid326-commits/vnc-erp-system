import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function load(file, mocks) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => name in mocks ? mocks[name] : require(name),
    console: { error() {} },
  });
  return exports;
}

function makeRoute({ profile = { id: 'profile-id', is_active: true }, profileError = null, moduleError = null } = {}) {
  const filters = [];
  const client = {
    auth: { getUser: async (token) => token === 'valid'
      ? { data: { user: { id: 'auth-id' } }, error: null }
      : { data: { user: null }, error: { message: 'invalid' } } },
    from: (table) => ({
      select: () => ({
        eq: (field, value) => {
          filters.push({ table, field, value });
          return table === 'user_profiles'
            ? { maybeSingle: async () => ({ data: profile, error: profileError }) }
            : Promise.resolve({ data: [{ can_view: true }], error: moduleError });
        },
      }),
    }),
  };
  const { GET } = load('../app/api/modules/user/route.ts', {
    '@/lib/db/supabase': { supabaseAdmin: client },
  });
  return { GET, filters };
}

function request(token) {
  return new Request('http://localhost/api/modules/user', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

test('resolves module assignments using the active profile ID, not the auth ID', async () => {
  const { GET, filters } = makeRoute();
  const response = await GET(request('valid'));
  assert.equal(response.status, 200);
  assert.deepEqual(filters, [
    { table: 'user_profiles', field: 'auth_id', value: 'auth-id' },
    { table: 'user_modules', field: 'user_id', value: 'profile-id' },
  ]);
  assert.deepEqual(await response.json(), [{ can_view: true }]);
});

test('rejects unauthenticated, missing, and inactive profiles', async () => {
  assert.equal((await makeRoute().GET(request())).status, 401);
  assert.equal((await makeRoute().GET(request('invalid'))).status, 401);
  assert.equal((await makeRoute({ profile: null }).GET(request('valid'))).status, 403);
  assert.equal((await makeRoute({ profile: { id: 'p', is_active: false } }).GET(request('valid'))).status, 403);
});

test('reports database failures rather than returning an empty permission list', async () => {
  assert.equal((await makeRoute({ profileError: { message: 'db error' } }).GET(request('valid'))).status, 500);
  assert.equal((await makeRoute({ moduleError: { message: 'db error' } }).GET(request('valid'))).status, 500);
});

test('links assigned active modules and hides inactive modules', () => {
  const userModules = [
    { can_view: true, module: { name: 'clients', display_name: 'Clientes', is_active: true } },
    { can_view: true, module: { name: 'suppliers', display_name: 'Proveedores', is_active: true } },
    { can_view: true, module: { name: 'inventory', display_name: 'Inventario', is_active: true } },
    { can_view: true, module: { name: 'purchases', display_name: 'Compras', is_active: true } },
    { can_view: true, module: { name: 'reports', display_name: 'Reportes', is_active: true } },
    { can_view: true, module: { name: 'pos', display_name: 'Punto de Venta', is_active: false } },
  ];
  const { default: Sidebar } = load('../components/layout/Sidebar.tsx', {
    '@/hooks': { useModuleStore: () => ({ userModules }) },
    'next/link': { default: ({ href, children, ...props }) => createElement('a', { ...props, href }, children) },
  });
  const html = renderToStaticMarkup(createElement(Sidebar));
  assert.match(html, /href="\/dashboard\/clientes"/);
  assert.match(html, /href="\/dashboard\/proveedores"/);
  assert.match(html, /href="\/dashboard\/inventario"/);
  assert.match(html, /href="\/dashboard\/compras"/);
  assert.match(html, /href="\/dashboard\/informes"/);
  assert.doesNotMatch(html, /Punto de Venta/);
  assert.match(html, /href="\/dashboard"/);
});
