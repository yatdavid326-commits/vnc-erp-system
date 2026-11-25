import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('FAQ documents account, operations and database recovery topics', () => {
  const path = fileURLToPath(new URL('../docs/FAQ.md', import.meta.url));
  assert.equal(existsSync(path), true);
  const source = readFileSync(path, 'utf8');
  assert.match(source, /¿Qué hago si no puedo iniciar sesión\?/);
  assert.match(source, /¿Por qué no aparece un módulo o una acción\?/);
  assert.match(source, /¿Cómo se restaura la información\?/);
});
