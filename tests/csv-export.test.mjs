import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import {
  generateAllModuleCsvZip,
  serializeRecordsToCsv,
} from '../lib/utils/csvExport.ts';

test('serializeRecordsToCsv escapes commas, quotes, and nested values', () => {
  const csv = serializeRecordsToCsv([
    {
      nombre: 'Ana, "A"',
      activo: true,
      extra: { zona: 'norte' },
      nota: ' =HYPERLINK("https://example.com")',
    },
  ]);

  assert.match(csv, /^\uFEFF/);
  assert.match(csv, /"Ana, ""A"""/);
  assert.match(csv, /"\{""zona"":""norte""\}"/);
  assert.match(csv, /"' =HYPERLINK/);
});

test('generateAllModuleCsvZip paginates data and lists permission omissions', async () => {
  const originalFetch = globalThis.fetch;
  const requestedPages = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), 'http://localhost');
    const page = Number(url.searchParams.get('page'));

    if (url.pathname === '/api/clientes') {
      requestedPages.push(page);
      const data = page === 1 ? [{ nombre: 'Ana' }] : [{ nombre: 'Luis' }];
      return new Response(JSON.stringify(data), {
        headers: { 'X-Total-Count': '2', 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/caja') {
      return new Response(JSON.stringify({ error: 'Abre una caja.' }), { status: 409 });
    }

    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  };

  try {
    const blob = await generateAllModuleCsvZip({
      tipo: 'resumen',
      inicio: '2026-10-22',
      fin: '2026-11-22',
    });
    const zip = await JSZip.loadAsync(blob);
    const clientsCsv = await zip.file('clientes.csv').async('string');
    const manifestCsv = await zip.file('manifiesto.csv').async('string');

    assert.deepEqual(requestedPages, [1, 2]);
    assert.match(clientsCsv, /Ana/);
    assert.match(clientsCsv, /Luis/);
    assert.match(manifestCsv, /Exportado/);
    assert.match(manifestCsv, /Sin permiso de lectura/);
    assert.match(manifestCsv, /No disponible/);
    assert.equal(zip.file('asistencia.csv'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('generateAllModuleCsvZip fails instead of producing an empty unauthorized export', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    await assert.rejects(
      generateAllModuleCsvZip({
        tipo: 'resumen',
        inicio: '2026-10-22',
        fin: '2026-11-22',
      }),
      /No se pudo exportar Asistencia: Unauthorized/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
