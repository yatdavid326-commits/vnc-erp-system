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

test('all data APIs reject requests without an authenticated session', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const paths = [
    '/api/asistencia',
    '/api/caja',
    '/api/clientes?limit=1',
    '/api/compras',
    '/api/empleados',
    '/api/inventario',
    '/api/pos',
    '/api/pos/catalog',
    '/api/pos/register',
    '/api/proveedores',
    '/api/reportes',
    '/api/modules/user',
    '/api/admin/permissions',
    '/api/user/profile',
    '/api/auth/restore',
  ];
  const responses = await Promise.all(
    paths.map((path) => fetch(new URL(path, baseUrl)))
  );
  assert.deepEqual(
    responses.map((response) => response.status),
    Array(paths.length).fill(401)
  );
});

test('POS checkout and cash-register writes reject unauthenticated requests', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const responses = await Promise.all([
    fetch(new URL('/api/pos', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    fetch(new URL('/api/pos/register', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_balance: 0 }),
    }),
    fetch(new URL('/api/pos/register', baseUrl), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closing_balance: 0 }),
    }),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status),
    [401, 401, 401]
  );
});

test('customers API rejects invalid bearer tokens', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/clientes?limit=1', baseUrl), {
    headers: { Authorization: 'Bearer invalid-token' },
  });
  assert.equal(response.status, 401);
});

test('admin permissions API rejects invalid bearer tokens', async () => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const response = await fetch(new URL('/api/admin/permissions', baseUrl), {
    headers: { Authorization: 'Bearer invalid-token' },
  });
  assert.equal(response.status, 401);
});

test('authenticated module API returns assignments for the linked profile', async (t) => {
  const baseUrl = process.env.VNC_BASE_URL;
  assert.ok(baseUrl, 'Set VNC_BASE_URL to the server under test');

  const accessToken = process.env.VNC_TEST_AUTH_TOKEN;
  if (!accessToken) {
    t.skip('Set VNC_TEST_AUTH_TOKEN to an account with assigned modules');
    return;
  }

  const response = await fetch(new URL('/api/modules/user', baseUrl), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert.equal(response.status, 200);
  const modules = await response.json();
  assert.ok(Array.isArray(modules));
  assert.ok(modules.length > 0);
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
