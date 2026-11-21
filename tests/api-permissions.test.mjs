import assert from 'node:assert/strict';
import test from 'node:test';
import { getRequiredApiPermission } from '../lib/auth/apiPermissions.ts';

test('manual inventory movements require edit permission', () => {
  assert.deepEqual(
    getRequiredApiPermission('/api/inventario/550e8400-e29b-41d4-a716-446655440000/movimientos', 'POST'),
    { moduleName: 'inventory', permission: 'can_edit' }
  );
});
