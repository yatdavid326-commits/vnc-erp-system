import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('README links the user guide and API documentation', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../README.md', import.meta.url)),
    'utf8'
  );
  assert.match(source, /docs\/USER_GUIDE\.md/);
  assert.match(source, /docs\/FAQ\.md/);
  assert.match(source, /docs\/API\.md/);
  assert.match(source, /docs\/openapi\.json/);
});

test('user guide covers authentication, modules and common recovery', () => {
  const path = fileURLToPath(new URL('../docs/USER_GUIDE.md', import.meta.url));
  assert.equal(existsSync(path), true);
  const source = readFileSync(path, 'utf8');
  assert.match(source, /Inicio de sesi[oó]n/);
  assert.match(source, /Permisos/);
  assert.match(source, /Asistencia/);
  assert.match(source, /Problemas comunes/);
});
