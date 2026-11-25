import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('breadcrumbs expose current page and route labels', () => {
  const source = readFileSync(
    new URL('../components/common/Breadcrumbs.tsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /aria-label="Migas de navegación"/);
  assert.match(source, /aria-current="page"/);
  assert.match(source, /inventario: 'Inventario'/);
  assert.match(source, /compras: 'Compras'/);
});
