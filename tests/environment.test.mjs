import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAppEnvironment,
  getAppEnvironmentLabel,
} from '../lib/config/appEnvironment.ts';

test('app environment accepts explicit development staging and production values', () => {
  assert.equal(getAppEnvironment('development'), 'development');
  assert.equal(getAppEnvironment('staging'), 'staging');
  assert.equal(getAppEnvironment('production'), 'production');
  assert.equal(getAppEnvironment('unknown'), 'development');
  assert.equal(getAppEnvironment(undefined), 'development');
});

test('app environment labels distinguish operations from testing', () => {
  assert.equal(getAppEnvironmentLabel('staging'), 'Mejoras y pruebas');
  assert.equal(getAppEnvironmentLabel('production'), 'Operaciones');
  assert.equal(getAppEnvironmentLabel(undefined), 'Desarrollo local');
});
