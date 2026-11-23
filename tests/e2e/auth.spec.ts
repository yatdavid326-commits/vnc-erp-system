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

test('unauthenticated dashboard access redirects to login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'VNC Systems' })
  ).toBeVisible();
});

test('notification API rejects requests without a session cookie', async ({
  request,
}) => {
  const response = await request.get(
    'http://127.0.0.1:3000/api/notifications'
  );

  expect(response.status()).toBe(401);
});
