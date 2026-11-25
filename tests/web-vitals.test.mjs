import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('Web Vitals reporter dispatches only aggregate metric payloads', () => {
  const source = readFileSync(
    new URL('../components/monitoring/WebVitalsReporter.tsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /vnc-web-vital/);
  assert.match(source, /name:.*value:.*id:/);
  assert.doesNotMatch(source, /email|password|token|localStorage|document\.cookie/i);
});

test('root layout enables Vercel Analytics without custom personal data', () => {
  const source = readFileSync(
    new URL('../app/layout.tsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /@vercel\/analytics\/next/);
  assert.match(source, /<Analytics\s*\/>/);
  assert.doesNotMatch(source, /beforeSend|customData|userData|email|password/i);
});
