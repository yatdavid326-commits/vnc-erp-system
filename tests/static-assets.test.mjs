import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

test('public assets contain no Next/Vercel demo files', () => {
  const names = readdirSync(publicDir);
  assert.equal(names.includes('next.svg'), false);
  assert.equal(names.includes('globe.svg'), false);
  assert.equal(names.includes('window.svg'), false);
  assert.equal(names.includes('file.svg'), false);
  assert.equal(names.includes('vercel.svg'), false);
});

test('application favicon remains available', () => {
  assert.equal(existsSync(fileURLToPath(new URL('../app/favicon.ico', import.meta.url))), true);
});
