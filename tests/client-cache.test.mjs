import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearClientCache,
  getCachedValue,
  setCachedValue,
} from '../lib/utils/clientCache.ts';

test('client cache stores values, expires them and supports prefix clearing', () => {
  clearClientCache();
  setCachedValue('dashboard:metrics', { total: 10 }, 10_000);
  setCachedValue('modules:user', ['inventory'], 10_000);

  assert.deepEqual(getCachedValue('dashboard:metrics'), { total: 10 });
  clearClientCache('dashboard:');
  assert.equal(getCachedValue('dashboard:metrics'), undefined);
  assert.deepEqual(getCachedValue('modules:user'), ['inventory']);

  clearClientCache();
  assert.equal(getCachedValue('modules:user'), undefined);
});

test('client cache expires values by TTL', () => {
  clearClientCache();
  setCachedValue('short', 'value', -1);
  assert.equal(getCachedValue('short'), undefined);
});
