import { expect, test, type Page } from '@playwright/test';

const supplier = { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Proveedor de prueba' };
const product = { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Producto de prueba' };
const profile = { id: '550e8400-e29b-41d4-a716-446655440003', auth_id: '550e8400-e29b-41d4-a716-446655440004', email: 'test@example.invalid', full_name: 'Prueba', role: 'user', is_active: true };

async function mockSession(page: Page, inventoryEdit: boolean) {
  const modules = ['purchases', 'inventory'].map((name) => ({
    id: name, name, display_name: name, is_active: true, order_index: 1,
  }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/restore') {
      return route.fulfill({ json: { authenticated: true, user: { id: profile.auth_id }, profile } });
    }
    if (url.pathname === '/api/modules/all') return route.fulfill({ json: modules });
    if (url.pathname === '/api/modules/user') return route.fulfill({ json: modules.map((module) => ({
      id: module.id, user_id: profile.id, module_id: module.id, module,
      can_view: true, can_create: true, can_edit: module.name === 'inventory' ? inventoryEdit : true, can_delete: false,
    })) });
    if (url.pathname === '/api/user/profile') return route.fulfill({ json: profile });
    if (url.pathname === '/api/notifications') return route.fulfill({ json: { notifications: [], unreadCount: 0 } });
    return route.fulfill({ status: 500, json: { error: `Unexpected API ${url.pathname}` } });
  });
}

test('creates an order and receives a partial quantity', async ({ page }) => {
  await mockSession(page, true);
  let order: Record<string, unknown> | null = null;
  const lineId = '550e8400-e29b-41d4-a716-446655440005';
  let received = 0;
  let creation: Record<string, unknown> | null = null;
  let receipt: Record<string, unknown> | null = null;
  await page.route('**/api/compras**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/compras/opciones') {
      return route.fulfill({ json: { data: [url.searchParams.get('kind') === 'suppliers' ? supplier : product] } });
    }
    if (url.pathname === '/api/compras' && request.method() === 'POST') {
      creation = request.postDataJSON();
      order = {
        id: creation?.id, numero_po: creation?.numero_po, proveedor_id: supplier.id,
        fecha_orden: creation?.fecha_orden, estado: 'pending', monto_total: 5, notes: '', edit_version: 0, supplier,
        items: [{ id: lineId, product, quantity_ordered: 2, quantity_received: 0, unit_price: 2.5, line_total: 5 }],
      };
      return route.fulfill({ status: 201, json: { already_recorded: false } });
    }
    if (url.pathname === '/api/compras' && request.method() === 'GET') {
      if (order) {
        order.estado = received ? 'partially_received' : 'pending';
        order.items = [{ id: lineId, product, quantity_ordered: 2, quantity_received: received, unit_price: 2.5, line_total: 5 }];
      }
      return route.fulfill({ json: order ? [order] : [], headers: { 'X-Total-Count': order ? '1' : '0' } });
    }
    if (url.pathname.endsWith('/recepcion-parcial') && request.method() === 'POST') {
      receipt = request.postDataJSON();
      received = 1;
      return route.fulfill({ json: { already_recorded: false, complete: false } });
    }
    return route.fulfill({ status: 500, json: { error: 'Unexpected purchase request' } });
  });
  page.on('dialog', (dialog) => void dialog.accept());
  await page.goto('/dashboard/compras');
  await page.getByRole('button', { name: 'Nueva orden' }).click();
  await page.getByLabel('Número', { exact: true }).fill('PO-TEST');
  await page.getByRole('button', { name: 'Buscar proveedores' }).first().click();
  await page.getByRole('combobox', { name: 'Proveedor', exact: true }).first().selectOption(supplier.id);
  await page.getByRole('button', { name: 'Buscar productos' }).click();
  await page.getByRole('combobox', { name: 'Producto', exact: true }).selectOption(product.id);
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByLabel('Precio unitario').fill('2.50');
  await page.getByRole('button', { name: 'Agregar producto' }).click();
  await page.getByRole('button', { name: 'Crear orden pendiente' }).click();
  await expect(page.getByText('PO-TEST — Pendiente')).toBeVisible();
  expect(creation).toMatchObject({ numero_po: 'PO-TEST', proveedor_id: supplier.id, items: [{ product_id: product.id, quantity: 2, unit_price: 2.5 }] });
  await page.getByLabel('Fecha de recepción').fill('2026-11-23');
  await page.getByLabel('Cantidad recibida de Producto de prueba').fill('1');
  await page.getByRole('button', { name: 'Registrar recepción' }).click();
  await expect(page.getByRole('dialog', { name: 'Registrar recepción' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Registrar recepción' })
    .getByRole('button', { name: 'Confirmar' })
    .click();
  await expect(page.getByText('PO-TEST — Parcialmente recibida')).toBeVisible();
  expect(receipt).toMatchObject({ date: '2026-11-23', items: [{ item_id: lineId, quantity: 1 }] });
});

test('hides receipt controls without inventory edit permission', async ({ page }) => {
  await mockSession(page, false);
  await page.route('**/api/compras?**', (route) => route.fulfill({
    headers: { 'X-Total-Count': '1' },
    json: [{
      id: '550e8400-e29b-41d4-a716-446655440006', numero_po: 'PO-RESTRICTED',
      fecha_orden: '2026-11-23', estado: 'pending', monto_total: 5, supplier,
      notes: '', edit_version: 0,
      items: [{ id: '550e8400-e29b-41d4-a716-446655440005', product, quantity_ordered: 2, quantity_received: 0, unit_price: 2.5 }],
    }],
  }));
  await page.goto('/dashboard/compras');
  await expect(page.getByText('PO-RESTRICTED — Pendiente')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar recepción' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Anular' })).toBeVisible();
});
