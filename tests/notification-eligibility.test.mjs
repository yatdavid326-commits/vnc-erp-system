import assert from 'node:assert/strict';
import test from 'node:test';
import { isEligibleNotificationRecipient } from '../lib/services/notifications/recipientEligibility.ts';

test('only active profiles with inventory access or the admin role are eligible', () => {
  assert.equal(
    isEligibleNotificationRecipient(
      { auth_id: 'auth-user', is_active: true, role: 'admin' },
      false
    ),
    true
  );
  assert.equal(
    isEligibleNotificationRecipient(
      { auth_id: 'auth-user', is_active: true, role: 'employee' },
      true
    ),
    true
  );
  assert.equal(
    isEligibleNotificationRecipient(
      { auth_id: 'auth-user', is_active: true, role: 'employee' },
      false
    ),
    false
  );
  assert.equal(
    isEligibleNotificationRecipient(
      { auth_id: 'auth-user', is_active: false, role: 'admin' },
      true
    ),
    false
  );
  assert.equal(
    isEligibleNotificationRecipient(
      { auth_id: null, is_active: true, role: 'admin' },
      true
    ),
    false
  );
  assert.equal(
    isEligibleNotificationRecipient(
      { auth_id: undefined, is_active: true, role: 'admin' },
      true
    ),
    false
  );
});
