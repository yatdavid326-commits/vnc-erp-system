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

test('customers API rejects requests without an authenticated session', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/clientes?limit=1', baseUrl));
  assert.equal(response.status, 401);
});

test('customers API rejects invalid bearer tokens', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/clientes?limit=1', baseUrl), {
    headers: { Authorization: 'Bearer invalid-token' },
  });
  assert.equal(response.status, 401);
});

test('session sync rejects requests without a bearer token', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/auth/session', baseUrl), {
    method: 'POST',
  });
  assert.equal(response.status, 401);
});

test('session sync rejects invalid bearer tokens', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/auth/session', baseUrl), {
    method: 'POST',
    headers: { Authorization: 'Bearer invalid-token' },
  });
  assert.equal(response.status, 401);
});

test('signout clears the server-side access-token cookie', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/auth/signout', baseUrl), {
    method: 'POST',
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') ?? '', /sb-access-token=;/);
  assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=0/i);
});
