import assert from 'node:assert/strict';
import test from 'node:test';
import { getGeolocationErrorMessage } from '../lib/utils/geolocation.ts';

test('getGeolocationErrorMessage explains permission, signal, and timeout errors', () => {
  assert.match(getGeolocationErrorMessage(1, ''), /Permite el acceso/);
  assert.match(getGeolocationErrorMessage(2, ''), /señal GPS/);
  assert.match(getGeolocationErrorMessage(3, ''), /tardó demasiado/);
});

test('getGeolocationErrorMessage preserves an unknown browser error message', () => {
  assert.equal(getGeolocationErrorMessage(0, 'Error del dispositivo'), 'Error del dispositivo');
  assert.match(getGeolocationErrorMessage(0, ''), /No se pudo obtener/);
});
