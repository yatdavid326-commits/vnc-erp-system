import assert from 'node:assert/strict';
import test from 'node:test';
import { hasValidCronAuthorization } from '../lib/auth/cronAuthorization.ts';

test('cron authorization accepts only the configured bearer secret', () => {
  assert.equal(
    hasValidCronAuthorization('Bearer expected-secret', 'expected-secret'),
    true
  );
  assert.equal(
    hasValidCronAuthorization('Bearer wrong-secret', 'expected-secret'),
    false
  );
  assert.equal(
    hasValidCronAuthorization('Basic expected-secret', 'expected-secret'),
    false
  );
  assert.equal(hasValidCronAuthorization(null, 'expected-secret'), false);
  assert.equal(hasValidCronAuthorization('Bearer ', ''), false);
});
