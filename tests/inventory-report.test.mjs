import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: (name) => name in mocks ? mocks[name] : require(name), console: { error() {} } });
  return exports;
}

const report = load('../lib/inventoryReport.ts');

test('inventory report requires both permissions and validates aggregate data', async () => {
  let denied = 'reports';
  let rpcResult = { data: { total: 36, positive: 31, zero: 2, unregistered: 2, invalid: 1 }, error: null };
  const calls = [];
  const { GET } = load('../app/api/informes/inventario/route.ts', {
    '@/lib/inventoryReport': report,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: { rpc: async (name) => { calls.push(['rpc', name]); return rpcResult; } } };
    } },
  });
  const request = new Request('http://localhost/api/informes/inventario');
  assert.equal((await GET(request)).status, 403);
  assert.deepEqual(calls, [['authorize', 'reports', 'can_view']]);
  denied = 'inventory'; calls.length = 0;
  assert.equal((await GET(request)).status, 403);
  assert.deepEqual(calls, [['authorize', 'reports', 'can_view'], ['authorize', 'inventory', 'can_view']]);
  denied = ''; calls.length = 0;
  const response = await GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).total, 36);
  assert.deepEqual(calls, [['authorize', 'reports', 'can_view'], ['authorize', 'inventory', 'can_view'], ['rpc', 'inventory_status_report']]);
  rpcResult = { data: { total: 0, positive: 0, zero: 0, unregistered: 0, invalid: 0 }, error: null };
  assert.equal((await (await GET(request)).json()).total, 0);
  rpcResult = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await GET(request)).status, 500);
  rpcResult = { data: { total: 2, positive: 1, zero: 0, unregistered: 0, invalid: 0 }, error: null };
  assert.equal((await GET(request)).status, 500);
  rpcResult = { data: { total: 0, positive: -1, zero: 1, unregistered: 0, invalid: 0 }, error: null };
  assert.equal((await GET(request)).status, 500);
});
