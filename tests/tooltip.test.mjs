import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('tooltip component exposes accessible tooltip role and hover/focus content', () => {
  const source = readFileSync(
    new URL('../components/common/Tooltip.tsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /role="tooltip"/);
  assert.match(source, /group-hover:block/);
  assert.match(source, /group-focus-within:block/);
});
