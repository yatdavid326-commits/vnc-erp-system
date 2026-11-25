import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getGeolocationErrorMessage,
  validateAttendanceLocation,
} from '../lib/utils/geolocation.ts';

test('getGeolocationErrorMessage explains permission, signal, and timeout errors', () => {
  assert.match(getGeolocationErrorMessage(1, ''), /Permite el acceso/);
  assert.match(getGeolocationErrorMessage(2, ''), /señal GPS/);
  assert.match(getGeolocationErrorMessage(3, ''), /tardó demasiado/);
});

test('getGeolocationErrorMessage preserves an unknown browser error message', () => {
  assert.equal(getGeolocationErrorMessage(0, 'Error del dispositivo'), 'Error del dispositivo');
  assert.match(getGeolocationErrorMessage(0, ''), /No se pudo obtener/);
});

test('attendance location accepts fresh precise coordinates', () => {
  const now = 1_700_000_000_000;
  assert.deepEqual(
    validateAttendanceLocation(14.6349, -90.5069, 25, now - 30_000, now),
    { ok: true }
  );
});

test('attendance location rejects invalid, inaccurate and stale positions', () => {
  const now = 1_700_000_000_000;
  assert.equal(
    validateAttendanceLocation(91, 0, 20, now - 30_000, now).ok,
    false
  );
  assert.equal(
    validateAttendanceLocation(14.6349, -90.5069, 251, now - 30_000, now).ok,
    false
  );
  assert.equal(
    validateAttendanceLocation(14.6349, -90.5069, 20, now - 121_000, now).ok,
    false
  );
  assert.equal(
    validateAttendanceLocation(14.6349, -90.5069, 20, now + 1_000, now).ok,
    false
  );
});
