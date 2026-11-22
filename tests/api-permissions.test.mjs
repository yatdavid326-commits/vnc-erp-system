import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessAdminApi,
  getRequiredApiPermission,
} from '../lib/auth/apiPermissions.ts';

test('manual inventory movements require edit permission', () => {
  assert.deepEqual(
    getRequiredApiPermission('/api/inventario/550e8400-e29b-41d4-a716-446655440000/movimientos', 'POST'),
    { moduleName: 'inventory', permission: 'can_edit' }
  );
});

test('admin endpoints require an active administrator profile', () => {
  const path = '/api/admin/permissions';

  assert.equal(
    canAccessAdminApi(path, { role: 'admin', is_active: true }),
    true
  );
  assert.equal(
    canAccessAdminApi(path, { role: 'admin', is_active: false }),
    false
  );
  assert.equal(
    canAccessAdminApi(path, { role: 'manager', is_active: true }),
    false
  );
  assert.equal(canAccessAdminApi('/api/admin/other', { role: 'admin', is_active: true }), false);
});
