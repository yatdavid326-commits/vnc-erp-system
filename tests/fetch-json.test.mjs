import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchJson } from '../lib/utils/fetchJson.ts';

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
