import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('theme toggle persists and exposes light/dark labels', () => {
  const source = readFileSync(
    new URL('../components/common/ThemeToggle.tsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /vnc-theme/);
  assert.match(source, /Activar tema oscuro/);
  assert.match(source, /Activar tema claro/);
});

test('global styles include explicit dark theme variables', () => {
  const source = readFileSync(
    new URL('../app/globals.css', import.meta.url),
    'utf8'
  );
  assert.match(source, /html\[data-theme='dark'\]/);
  assert.match(source, /#111827/);
});
