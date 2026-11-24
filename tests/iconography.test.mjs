import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('shared action buttons use consistent Lucide icons and variants', () => {
  const source = readFileSync(
    new URL('../components/common/ActionButton.tsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /aria-label=\{title\}/);
  assert.match(source, /variant === 'delete'/);
  assert.match(source, /variant === 'movement'/);
});

test('client, supplier and inventory tables use the shared action component', () => {
  for (const path of [
    '../components/clientes/ClientesTable.tsx',
    '../components/proveedores/ProveedoresTable.tsx',
    '../components/inventario/InventarioTable.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /@\/components\/common\/ActionButton/);
  }
});
