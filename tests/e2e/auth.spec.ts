import { expect, test } from '@playwright/test';

test('login page displays username and password fields', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'VNC Systems' })
  ).toBeVisible();
  await expect(page.getByLabel('Usuario')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toHaveAttribute(
    'type',
    'password'
  );
});

test('failed login is shown without persisting legacy session tokens', async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const key of [
      'supabase-session',
      'supabase-access-token',
      'supabase-refresh-token',
      'supabase-user',
    ]) {
      localStorage.setItem(key, 'legacy-test-value');
    }
  });
  await page.route('**/api/auth/signin', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Credenciales de prueba no válidas.' }),
    })
  );

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('e2e-test-user');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  await expect(
    page.getByRole('alert').filter({
      hasText: 'Credenciales de prueba no válidas.',
    })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  const legacySessionKeys = await page.evaluate(() =>
    [
      'supabase-session',
      'supabase-access-token',
      'supabase-refresh-token',
      'supabase-user',
    ].filter((key) => localStorage.getItem(key) !== null)
  );
  expect(legacySessionKeys).toEqual([]);
});

test('login displays the rate-limit message', async ({ page }) => {
  await page.route('**/api/auth/signin', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'Retry-After': '60' },
      body: JSON.stringify({ error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente más tarde.' }),
    })
  );
  await page.goto('/login');
  await page.getByLabel('Usuario').fill('e2e-test-user');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Demasiados intentos' })).toBeVisible();
});

test('unauthenticated dashboard access redirects to login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'VNC Systems' })
  ).toBeVisible();
});

test('sign-in rejects cross-origin and non-JSON requests', async ({ request }) => {
  const url = 'http://127.0.0.1:3000/api/auth/signin';
  const crossOrigin = await request.post(url, {
    headers: {
      Origin: 'https://other.example',
      'Content-Type': 'text/plain',
    },
    data: '{"username":"test","password":"test"}',
  });
  expect(crossOrigin.status()).toBe(403);
  expect(crossOrigin.headers()['set-cookie']).toBeUndefined();

  const form = await request.post(url, {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      'Content-Type': 'text/plain',
    },
    data: '{"username":"test","password":"test"}',
  });
  expect(form.status()).toBe(415);
  expect(form.headers()['set-cookie']).toBeUndefined();

  const sameOrigin = await request.post(url, {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { username: '', password: '' },
  });
  expect(sameOrigin.status()).toBe(400);
});

test('notification API rejects requests without a session cookie', async ({
  request,
}) => {
  const response = await request.get(
    'http://127.0.0.1:3000/api/notifications'
  );

  expect(response.status()).toBe(401);
});
