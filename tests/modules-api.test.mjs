import assert from 'node:assert/strict';
import test from 'node:test';

test('modules API returns the configured modules in database order', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/modules/all', baseUrl));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);

  const modules = await response.json();
  assert.ok(Array.isArray(modules));
  assert.ok(modules.some((module) => module.name === 'dashboard'));
  for (const [index, module] of modules.entries()) {
    assert.equal(typeof module.is_active, 'boolean');
    assert.equal(typeof module.order_index, 'number');
    if (index > 0) {
      assert.ok(modules[index - 1].order_index <= module.order_index);
    }
  }
});
