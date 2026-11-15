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

const schema = load('../lib/inventoryValuationReport.ts');

test('valuation schema preserves exact decimal strings and enforces count consistency', () => {
  const valid = {
    total_products: 4, valued_products: 2, not_valued_products: 2, invalid_cost_products: 1,
    inventory_cost_value_gtq: '123456789012345.67',
  };
  assert.equal(schema.inventoryValuationReportSchema.safeParse(valid).success, true);
  assert.equal(schema.inventoryValuationReportSchema.safeParse({
    ...valid, inventory_cost_value_gtq: 'NaN',
  }).success, false);
  assert.equal(schema.inventoryValuationReportSchema.safeParse({
    ...valid, total_products: 5,
  }).success, false);
  assert.equal(schema.inventoryValuationReportSchema.safeParse({
    ...valid, invalid_cost_products: 3,
  }).success, false);
});

test('valuation endpoint requires reports and inventory access and validates RPC output', async () => {
  let denied = 'reports';
  let rpcResult = {
    data: {
      total_products: 4, valued_products: 2, not_valued_products: 2, invalid_cost_products: 1,
      inventory_cost_value_gtq: '125.50',
    },
    error: null,
  };
  const calls = [];
  const { GET } = load('../app/api/informes/inventario/valoracion/route.ts', {
    '@/lib/inventoryValuationReport': schema,
    '@/lib/services/modules/authorization': { authorizeModule: async (_, name, permission) => {
      calls.push(['authorize', name, permission]);
      return name === denied ? { error: Response.json({}, { status: 403 }) } :
        { client: { rpc: async (name) => { calls.push(['rpc', name]); return rpcResult; } } };
    } },
  });
  const request = new Request('http://localhost/api/informes/inventario/valoracion');
  assert.equal((await GET(request)).status, 403);
  assert.deepEqual(calls, [['authorize', 'reports', 'can_view']]);
  denied = 'inventory'; calls.length = 0;
  assert.equal((await GET(request)).status, 403);
  assert.deepEqual(calls, [['authorize', 'reports', 'can_view'], ['authorize', 'inventory', 'can_view']]);
  denied = ''; calls.length = 0;
  const response = await GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).inventory_cost_value_gtq, '125.50');
  assert.deepEqual(calls, [
    ['authorize', 'reports', 'can_view'], ['authorize', 'inventory', 'can_view'],
    ['rpc', 'inventory_valuation_report'],
  ]);
  rpcResult = { data: null, error: { message: 'database unavailable' } };
  assert.equal((await GET(request)).status, 500);
  rpcResult = { data: { ...schema.inventoryValuationReportSchema.parse({
    total_products: 0, valued_products: 0, not_valued_products: 0, invalid_cost_products: 0,
    inventory_cost_value_gtq: '0',
  }), total_products: 1 }, error: null };
  assert.equal((await GET(request)).status, 500);
});
