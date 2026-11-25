import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const runbookUrl = new URL('../docs/DISASTER_RECOVERY.md', import.meta.url);
const guideUrl = new URL('../MAINTENANCE_GUIDE.md', import.meta.url);

test('disaster recovery runbook defines RPO RTO and isolated restoration', () => {
  const source = readFileSync(runbookUrl, 'utf8');
  assert.match(source, /RPO:\s*24 horas/);
  assert.match(source, /RTO objetivo:\s*4 horas/);
  assert.match(source, /base aislada/);
  assert.match(source, /No usar la llave de servicio/);
  assert.match(source, /dos responsables/);
});

test('maintenance guide links the disaster recovery runbook', () => {
  const source = readFileSync(guideUrl, 'utf8');
  assert.match(source, /docs\/DISASTER_RECOVERY\.md/);
});
