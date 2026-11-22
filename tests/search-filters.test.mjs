import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizePostgrestSearch } from '../lib/utils/search.ts';

test('sanitizePostgrestSearch removes PostgREST filter syntax', () => {
  assert.equal(sanitizePostgrestSearch('  Ana, %*(_ "  Pérez  '), 'Ana Pérez');
});

test('sanitizePostgrestSearch returns an empty term for filter-only input', () => {
  assert.equal(sanitizePostgrestSearch('%,_*()\\"'), '');
});
