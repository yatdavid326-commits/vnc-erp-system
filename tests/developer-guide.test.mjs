import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('developer guide documents setup, migrations and validation', () => {
  const path = fileURLToPath(new URL('../docs/DEVELOPER_GUIDE.md', import.meta.url));
  assert.equal(existsSync(path), true);
  const source = readFileSync(path, 'utf8');
  assert.match(source, /npm install/);
  assert.match(source, /Migraciones/);
  assert.match(source, /No modificar migraciones hist[oó]ricas/);
  assert.match(source, /npm run test:unit/);
  assert.match(source, /npm run build/);
});
