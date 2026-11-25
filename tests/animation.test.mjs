import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('global animations respect reduced motion', () => {
  const css = readFileSync(
    new URL('../app/globals.css', import.meta.url),
    'utf8'
  );
  assert.match(css, /@keyframes vnc-fade-in/);
  assert.match(css, /@keyframes vnc-slide-up/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /animation-duration:\s*0\.01ms/);
});
