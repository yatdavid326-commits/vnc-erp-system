import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, parsePaginationParams } from '../lib/utils/pagination.ts';

test('pagination defaults to 25 rows and accepts valid requested pages', () => {
  assert.deepEqual(parsePaginationParams(new URLSearchParams()), {
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });
  assert.deepEqual(
    parsePaginationParams(new URLSearchParams('page=3&limit=50')),
    { page: 3, limit: 50 }
  );
});

test('pagination rejects invalid pages and limits above the configured maximum', () => {
  assert.equal('error' in parsePaginationParams(new URLSearchParams('page=0')), true);
  assert.equal('error' in parsePaginationParams(new URLSearchParams('page=1.5')), true);
  assert.equal('error' in parsePaginationParams(new URLSearchParams('page=1e2')), true);
  assert.equal(
    'error' in parsePaginationParams(new URLSearchParams('page=9007199254740991')),
    true
  );
  assert.equal(
    'error' in parsePaginationParams(new URLSearchParams(`limit=${MAX_PAGE_SIZE + 1}`)),
    true
  );
});
