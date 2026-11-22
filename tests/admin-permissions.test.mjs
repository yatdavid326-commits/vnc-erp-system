import assert from 'node:assert/strict';
import test from 'node:test';
import { modulePermissionSchema } from '../lib/validation/requestSchemas.ts';

const basePermission = {
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  module_id: '550e8400-e29b-41d4-a716-446655440001',
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
};

test('module permissions require read access for write capabilities', () => {
  assert.equal(modulePermissionSchema.safeParse(basePermission).success, true);
  assert.equal(
    modulePermissionSchema.safeParse({
      ...basePermission,
      can_edit: true,
    }).success,
    false
  );
  assert.equal(
    modulePermissionSchema.safeParse({
      ...basePermission,
      can_view: true,
      can_edit: true,
      extra: true,
    }).success,
    false
  );
});
