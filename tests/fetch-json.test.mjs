import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchJson, fetchPaginatedJson } from '../lib/utils/fetchJson.ts';

test('fetchJson surfaces server-provided API errors', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: 'Abre una caja antes de registrar movimientos.' }),
    { status: 409, headers: { 'Content-Type': 'application/json' } }
  );
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    fetchJson('/api/caja', 'Fallback error'),
    /Abre una caja antes de registrar movimientos\./
  );
});

test('fetchPaginatedJson returns the requested rows and total count', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify([{ id: 'one' }]),
    {
      headers: { 'Content-Type': 'application/json', 'X-Total-Count': '41' },
    }
  );
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  assert.deepEqual(
    await fetchPaginatedJson('/api/items?page=2&limit=25', 'Fallback error'),
    { data: [{ id: 'one' }], total: 41 }
  );
});

test('fetchPaginatedJson rejects responses without a total count', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([]));
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    fetchPaginatedJson('/api/items?page=1&limit=25', 'Fallback error'),
    /no incluye el total de registros/
  );
});
