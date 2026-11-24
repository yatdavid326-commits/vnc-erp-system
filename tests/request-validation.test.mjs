import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRequestBody } from '../lib/validation/requestBody.ts';
import {
  attendanceCreateSchema,
  cashMovementCreateSchema,
  cashMovementFormSchema,
  cashMovementUpdateSchema,
  customerCreateSchema,
  customerUpdateSchema,
  creditTransactionSchema,
  employeeCreateSchema,
  employeeUpdateSchema,
  inventoryMovementSchema,
  notificationReadSchema,
  notificationPreferencesSchema,
  productCreateSchema,
  reportEmailSchema,
  signInSchema,
  supplierCreateSchema,
} from '../lib/validation/requestSchemas.ts';
import { dashboardSummarySchema } from '../lib/validation/dashboardSummary.ts';
import { purchaseCreateSchema, purchaseDetailsSchema, purchaseReceiptSchema } from '../lib/purchases.ts';
import { MAX_ATTENDANCE_QR_LENGTH } from '../lib/utils/qrCode.ts';

test('dashboard summary accepts empty-state metrics and rejects invalid totals', () => {
  const emptySummary = {
    salesThisMonth: { amount: 0, count: 0 },
    stock: { productsWithStock: 0, availableUnits: 0 },
    activeCustomers: 0,
    totalIncome: 0,
    recentSales: [],
    lowStockCount: 0,
    lowStockProducts: [],
  };

  assert.equal(dashboardSummarySchema.safeParse(emptySummary).success, true);
  assert.equal(
    dashboardSummarySchema.safeParse({
      ...emptySummary,
      lowStockCount: -1,
    }).success,
    false
  );
});

test('purchase requests validate products, receipts and optimistic edit versions', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const order = {
    id, numero_po: 'PO-1', proveedor_id: id, fecha_orden: '2026-02-28',
    notes: '', items: [{ product_id: id, quantity: 2, unit_price: 1.25 }],
  };
  assert.equal(purchaseCreateSchema.safeParse(order).success, true);
  assert.equal(purchaseCreateSchema.safeParse({ ...order, items: [...order.items, ...order.items] }).success, false);
  assert.equal(purchaseCreateSchema.safeParse({ ...order, items: [{ ...order.items[0], unit_price: 0.001 }] }).success, false);
  assert.equal(purchaseCreateSchema.safeParse({ ...order, estado: 'received' }).success, false);
  const receipt = { id, date: '2026-02-28', items: [{ item_id: id, quantity: 1 }] };
  assert.equal(purchaseReceiptSchema.safeParse(receipt).success, true);
  assert.equal(purchaseReceiptSchema.safeParse({ ...receipt, items: [...receipt.items, ...receipt.items] }).success, false);
  assert.equal(purchaseReceiptSchema.safeParse({ ...receipt, date: '2026-02-31' }).success, false);
  assert.equal(purchaseDetailsSchema.safeParse({ fecha_orden: '2026-02-28', notes: '', edit_version: -1 }).success, false);
});

test('customer validation trims fields and rejects invalid email and unknown keys', () => {
  const valid = customerCreateSchema.safeParse({
    nombre: '  Ana  ',
    email: 'ana@example.com',
    tipo: 'retail',
  });

  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.nombre, 'Ana');

  assert.equal(
    customerCreateSchema.safeParse({
      nombre: 'Ana',
      email: 'not-an-email',
    }).success,
    false
  );
  assert.equal(
    customerCreateSchema.safeParse({
      nombre: 'Ana',
      email: 'ana@example.com',
      active: true,
    }).success,
    false
  );
});

test('credit movements accept signed adjustments but reject invalid monetary values', () => {
  const movement = {
    id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
    tipo: 'ajuste',
    monto: -12.34,
    fecha: '2026-11-23T00:00:00.000Z',
  };
  assert.equal(creditTransactionSchema.safeParse(movement).success, true);
  assert.equal(creditTransactionSchema.safeParse({ ...movement, tipo: 'pago' }).success, false);
  assert.equal(creditTransactionSchema.safeParse({ ...movement, monto: 0 }).success, false);
  assert.equal(creditTransactionSchema.safeParse({ ...movement, monto: 1.001 }).success, false);
  assert.equal(creditTransactionSchema.safeParse({ ...movement, id: 'bad' }).success, false);
  assert.equal(customerUpdateSchema.safeParse({ saldo_actual: 1 }).success, false);
  assert.equal(customerCreateSchema.safeParse({ nombre: 'Ana', email: 'ana@example.com', saldo_actual: 1 }).success, false);
});

test('update validation rejects empty objects and product validation enforces numeric limits', () => {
  assert.equal(customerUpdateSchema.safeParse({}).success, false);

  const invalidProduct = productCreateSchema.safeParse({
    nombre: 'Producto',
    sku: 'SKU-1',
    categoria: 'General',
    precio_venta: 10,
    stock_minimo: 1.5,
  });
  assert.equal(invalidProduct.success, false);
  assert.equal(
    productCreateSchema.safeParse({
      nombre: 'Producto',
      sku: 'SKU-1',
      categoria: 'General',
      precio_venta: 10,
      cantidad_stock: 5,
    }).success,
    false
  );

  const negativePrice = productCreateSchema.safeParse({
    nombre: 'Producto',
    sku: 'SKU-1',
    categoria: 'General',
    precio_venta: -1,
  });
  assert.equal(negativePrice.success, false);
});

test('attendance validation rejects invalid employee IDs and out-of-range coordinates', () => {
  const validAttendance = {
    empleado_id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
    fecha: '2026-11-21',
    hora_entrada: '08:00:00',
  };
  const parsed = attendanceCreateSchema.safeParse({
    empleado_id: 'EMP-123',
    fecha: '2026-11-21',
    hora_entrada: '08:00:00',
    latitud_entrada: 91,
    longitud_entrada: 0,
  });
  assert.equal(parsed.success, false);
  assert.equal(
    attendanceCreateSchema.safeParse({
      ...validAttendance,
      qr_code: 'x'.repeat(MAX_ATTENDANCE_QR_LENGTH),
    }).success,
    true
  );
  assert.equal(
    attendanceCreateSchema.safeParse({
      ...validAttendance,
      qr_code: 'x'.repeat(MAX_ATTENDANCE_QR_LENGTH + 1),
    }).success,
    false
  );
});

test('write schemas reject malformed business values and accept employee form data', () => {
  const employee = employeeCreateSchema.safeParse({
    nombre: 'Ana',
    email: 'ana@example.com',
    telefono: '555-0101',
    cargo: 'Cajera',
    departamento: 'Ventas',
    salario: 0,
    estado: 'activo',
  });
  assert.equal(employee.success, true);
  assert.equal(employeeUpdateSchema.safeParse({ telefono: '555-0101', cargo: 'Cajera', estado: 'inactivo' }).success, true);

  assert.equal(
    supplierCreateSchema.safeParse({
      nombre: 'Proveedor',
      email: 'invalid',
    }).success,
    false
  );
  assert.equal(
    purchaseCreateSchema.safeParse({
      numero_po: 'PO-1',
      proveedor_id: 'not-a-uuid',
      fecha_orden: '2026-02-31',
    }).success,
    false
  );
  assert.equal(
    cashMovementCreateSchema.safeParse({
      cash_register_id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
      movement_type: 'ingreso',
      amount: 0,
    }).success,
    false
  );
  assert.equal(
    cashMovementFormSchema.safeParse({
      tipo: 'ingreso',
      concepto: 'Venta',
      monto: 15,
      referencia: 'REF-1',
      fecha: '2026-11-21',
    }).success,
    true
  );
  assert.equal(
    cashMovementFormSchema.safeParse({
      tipo: 'egreso',
      concepto: 'Compra',
      monto: 0,
      fecha: '2026-02-31',
    }).success,
    false
  );
  assert.equal(cashMovementUpdateSchema.safeParse({ amount: 10 }).success, true);
  assert.equal(cashMovementUpdateSchema.safeParse({ cash_register_id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09' }).success, false);
  assert.equal(cashMovementUpdateSchema.safeParse({ reference_id: null }).success, false);
  assert.equal(
    inventoryMovementSchema.safeParse({
      id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
      type: 'adjustment',
      quantity: 0,
      notes: 'Inventario inicial',
    }).success,
    true
  );
  assert.equal(
    inventoryMovementSchema.safeParse({
      id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
      type: 'entry',
      quantity: 0,
      notes: 'Entrada',
    }).success,
    false
  );
  assert.equal(
    cashMovementCreateSchema.safeParse({
      cash_register_id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
      movement_type: 'ingreso',
      amount: 1,
      created_by: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
    }).success,
    false
  );
  assert.equal(
    signInSchema.safeParse({ username: 'ana', password: '' }).success,
    false
  );
});

test('notification preferences require an E.164 number for each explicit opt-in', () => {
  assert.equal(
    notificationPreferencesSchema.safeParse({
      phone_e164: '+50255550123',
      sms_opt_in: true,
      whatsapp_opt_in: false,
    }).success,
    true
  );
  assert.equal(
    notificationPreferencesSchema.safeParse({
      phone_e164: null,
      sms_opt_in: false,
      whatsapp_opt_in: false,
    }).success,
    true
  );
  assert.equal(
    notificationPreferencesSchema.safeParse({
      phone_e164: null,
      sms_opt_in: false,
      whatsapp_opt_in: true,
    }).success,
    false
  );
  assert.equal(
    notificationPreferencesSchema.safeParse({
      phone_e164: '555-0123',
      sms_opt_in: true,
      whatsapp_opt_in: false,
    }).success,
    false
  );
});

test('notification read updates require exactly one valid target', () => {
  assert.equal(
    notificationReadSchema.safeParse({
      id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
    }).success,
    true
  );
  assert.equal(notificationReadSchema.safeParse({ all: true }).success, true);
  assert.equal(notificationReadSchema.safeParse({}).success, false);
  assert.equal(
    notificationReadSchema.safeParse({
      id: 'ed8c4009-88bf-4aeb-a0a8-6e63841f3d09',
      all: true,
    }).success,
    false
  );
  assert.equal(
    notificationReadSchema.safeParse({ id: 'not-a-uuid' }).success,
    false
  );
});

test('report email accepts a valid current report but not arbitrary recipients or periods', () => {
  const report = {
    tipo: 'resumen',
    periodo: '2026-11-01 a 2026-11-22',
    total_ventas: 125.5,
    total_compras: 20,
    total_ingresos_caja: 12,
    total_egresos_caja: 4,
    total_clientes: 3,
    total_proveedores: 2,
    total_productos: 5,
    total_asistencias: 8,
  };

  assert.equal(reportEmailSchema.safeParse({ report }).success, true);
  assert.equal(
    reportEmailSchema.safeParse({
      report: { ...report, periodo: '2026-11-22 a 2026-11-01' },
    }).success,
    false
  );
  assert.equal(
    reportEmailSchema.safeParse({
      report,
      to: 'someone@example.com',
    }).success,
    false
  );
});

test('request body parser returns a structured 400 for malformed JSON', async () => {
  const request = new Request('http://localhost/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });

  const parsed = await validateRequestBody(request, customerCreateSchema);
  assert.equal(parsed.success, false);
  if (parsed.success) return;

  assert.equal(parsed.response.status, 400);
  const payload = await parsed.response.json();
  assert.equal(payload.error, 'Los datos enviados no son válidos.');
  assert.equal(payload.details[0].field, '');
});

test('request body parser returns field paths for schema failures', async () => {
  const request = new Request('http://localhost/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Ana', email: 'invalid' }),
  });

  const parsed = await validateRequestBody(request, customerCreateSchema);
  assert.equal(parsed.success, false);
  if (parsed.success) return;

  const payload = await parsed.response.json();
  assert.ok(payload.details.some((issue) => issue.field === 'email'));
});
