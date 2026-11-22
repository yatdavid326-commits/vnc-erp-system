import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_ATTENDANCE_QR_LENGTH,
  validateQrCodePayload,
} from '../lib/utils/qrCode.ts';

test('validateQrCodePayload trims and accepts a non-empty QR value', () => {
  assert.deepEqual(validateQrCodePayload('  employee-card-7  '), {
    ok: true,
    value: 'employee-card-7',
  });
});

test('validateQrCodePayload rejects empty and oversized QR values', () => {
  assert.deepEqual(validateQrCodePayload('  '), {
    ok: false,
    error: 'El código QR no contiene datos.',
  });
  assert.equal(
    validateQrCodePayload('x'.repeat(MAX_ATTENDANCE_QR_LENGTH + 1)).ok,
    false
  );
});
