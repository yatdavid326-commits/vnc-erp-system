import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRequestBody } from '../lib/validation/requestBody.ts';
import {
  attendanceCreateSchema,
  cashMovementCreateSchema,
  cashMovementFormSchema,
  customerCreateSchema,
  customerUpdateSchema,
  employeeCreateSchema,
  employeeUpdateSchema,
  inventoryMovementSchema,
  purchaseCreateSchema,
  productCreateSchema,
  signInSchema,
  supplierCreateSchema,
} from '../lib/validation/requestSchemas.ts';
import { MAX_ATTENDANCE_QR_LENGTH } from '../lib/utils/qrCode.ts';

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
