import { z } from 'zod';

const requiredText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);
const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional();
const finiteNumber = z.number().finite();
const nonNegativeNumber = finiteNumber.nonnegative();
const positiveNumber = finiteNumber.positive();
const uuid = z.string().uuid();

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Debe ser una fecha válida con formato AAAA-MM-DD.');

const dateOrDateTime = z.union([
  dateOnly,
  z.string().datetime({ offset: true }),
]);

function updateSchema<T extends z.ZodRawShape>(shape: T) {
  return z
    .object(shape)
    .partial()
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Debe proporcionar al menos un campo.',
    });
}

const customerFields = {
  nombre: requiredText(200),
  email: z.string().trim().email().max(254),
  telefono: optionalText(50),
  direccion: optionalText(500),
  ciudad: optionalText(120),
  estado: optionalText(120),
  codigo_postal: optionalText(24),
  tipo: z.enum(['retail', 'wholesale', 'business']),
  limite_credito: nonNegativeNumber,
  saldo_actual: finiteNumber,
  estado_cliente: z.enum(['activo', 'inactivo', 'suspendido']),
};

export const customerCreateSchema = z
  .object({
    ...customerFields,
    tipo: customerFields.tipo.optional(),
    limite_credito: customerFields.limite_credito.optional(),
    saldo_actual: customerFields.saldo_actual.optional(),
    estado_cliente: customerFields.estado_cliente.optional(),
  })
  .strict();

export const customerUpdateSchema = updateSchema(customerFields);

const supplierFields = {
  nombre: requiredText(200),
  persona_contacto: optionalText(200),
  email: z.string().trim().email().max(254),
  teléfono: optionalText(50),
  dirección: optionalText(500),
  ciudad: optionalText(120),
  estado: optionalText(120),
  país: optionalText(120),
  términos_pago: optionalText(200),
  activo: z.boolean(),
};

export const supplierCreateSchema = z
  .object({
    ...supplierFields,
    persona_contacto: supplierFields.persona_contacto.optional(),
    teléfono: supplierFields.teléfono.optional(),
    dirección: supplierFields.dirección.optional(),
    ciudad: supplierFields.ciudad.optional(),
    estado: supplierFields.estado.optional(),
    país: supplierFields.país.optional(),
    términos_pago: supplierFields.términos_pago.optional(),
    activo: supplierFields.activo.optional(),
  })
  .strict();

export const supplierUpdateSchema = updateSchema(supplierFields);

const employeeFields = {
  nombre: requiredText(150),
  apellido: optionalText(150),
  email: z.string().trim().email().max(254),
  teléfono: optionalText(50),
  telefono: optionalText(50),
  puesto: optionalText(120),
  cargo: optionalText(120),
  departamento: optionalText(120),
  fecha_ingreso: dateOnly,
  salario: nonNegativeNumber,
  estado: z.union([z.boolean(), z.enum(['activo', 'inactivo'])]),
};

export const employeeCreateSchema = z
  .object({
    ...employeeFields,
    apellido: employeeFields.apellido.optional(),
    teléfono: employeeFields.teléfono.optional(),
    telefono: employeeFields.telefono.optional(),
    puesto: employeeFields.puesto.optional(),
    cargo: employeeFields.cargo.optional(),
    departamento: employeeFields.departamento.optional(),
    fecha_ingreso: employeeFields.fecha_ingreso.optional(),
    salario: employeeFields.salario.optional(),
    estado: employeeFields.estado.optional(),
  })
  .strict();

const employeeUpdateFields = {
  nombre: requiredText(150),
  apellido: optionalText(150),
  email: z.string().trim().email().max(254),
  teléfono: optionalText(50),
  telefono: optionalText(50),
  puesto: optionalText(120),
  cargo: optionalText(120),
  departamento: optionalText(120),
  fecha_ingreso: dateOnly,
  salario: nonNegativeNumber,
  estado: z.enum(['activo', 'inactivo']),
};

export const employeeUpdateSchema = updateSchema(employeeUpdateFields);

const purchaseFields = {
  numero_po: requiredText(80),
  numero_recibo: optionalText(80),
  proveedor_id: uuid,
  fecha_orden: dateOnly,
  fecha: dateOnly,
  fecha_entrega_esperada: dateOnly,
  estado: z.enum([
    'pending',
    'received',
    'partial',
    'cancelled',
    'pendiente',
    'recibido',
    'cancelado',
  ]),
  monto_total: nonNegativeNumber,
  total: nonNegativeNumber,
};

export const purchaseCreateSchema = z
  .object({
    ...purchaseFields,
    numero_recibo: purchaseFields.numero_recibo.optional(),
    fecha: purchaseFields.fecha.optional(),
    fecha_entrega_esperada: purchaseFields.fecha_entrega_esperada.optional(),
    estado: purchaseFields.estado.optional(),
    monto_total: purchaseFields.monto_total.optional(),
    total: purchaseFields.total.optional(),
  })
  .strict();

const purchaseUpdateFields = {
  numero_po: requiredText(80),
  proveedor_id: uuid,
  fecha_orden: dateOnly,
  fecha_entrega_esperada: dateOnly,
  estado: z.enum([
    'pending',
    'received',
    'partial',
    'cancelled',
    'pendiente',
    'recibido',
    'cancelado',
  ]),
  monto_total: nonNegativeNumber,
};

export const purchaseUpdateSchema = updateSchema(purchaseUpdateFields);

const productFields = {
  nombre: requiredText(200),
  sku: requiredText(80),
  descripcion: optionalText(2000),
  categoria: requiredText(120),
  costo_unitario: nonNegativeNumber,
  precio_venta: positiveNumber,
  stock_minimo: z.number().int().nonnegative(),
};

export const productCreateSchema = z
  .object({
    ...productFields,
    descripcion: productFields.descripcion.optional(),
    costo_unitario: productFields.costo_unitario.optional(),
    stock_minimo: productFields.stock_minimo.optional(),
  })
  .strict();

export const productUpdateSchema = updateSchema(productFields);

export const inventoryMovementSchema = z
  .object({
    id: uuid,
    type: z.enum(['entry', 'exit', 'adjustment']),
    quantity: z.number().int().min(0).max(2147483647),
    notes: requiredText(500),
  })
  .strict()
  .refine((value) => value.type === 'adjustment' || value.quantity > 0, {
    path: ['quantity'],
    message: 'La cantidad debe ser mayor que cero para entradas y salidas.',
  });

const cashMovementFields = {
  cash_register_id: uuid,
  movement_type: z.enum(['ingreso', 'egreso']),
  amount: positiveNumber,
  reference_id: uuid.nullable(),
  description: optionalText(1000),
};

export const cashMovementCreateSchema = z
  .object({
    ...cashMovementFields,
    reference_id: cashMovementFields.reference_id.optional(),
    description: cashMovementFields.description.optional(),
  })
  .strict();

export const cashMovementFormSchema = z
  .object({
    tipo: z.enum(['ingreso', 'egreso']),
    concepto: requiredText(1000),
    monto: positiveNumber,
    referencia: optionalText(200),
    fecha: dateOnly,
  })
  .strict();

export const cashMovementUpdateSchema = updateSchema(cashMovementFields);

const attendanceFields = {
  empleado_id: uuid,
  fecha: dateOnly,
  hora_entrada: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  hora_salida: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
    .nullable(),
  latitud_entrada: z.number().finite().min(-90).max(90).nullable(),
  longitud_entrada: z.number().finite().min(-180).max(180).nullable(),
  latitud_salida: z.number().finite().min(-90).max(90).nullable(),
  longitud_salida: z.number().finite().min(-180).max(180).nullable(),
  qr_code: optionalText(200),
  observaciones: optionalText(2000),
};

function hasPairedCoordinates(
  body: Partial<z.infer<z.ZodObject<typeof attendanceFields>>>,
  context: z.RefinementCtx
) {
  for (const [latitude, longitude] of [
    ['latitud_entrada', 'longitud_entrada'],
    ['latitud_salida', 'longitud_salida'],
  ] as const) {
    if (
      (body[latitude] === undefined) !==
      (body[longitude] === undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [latitude],
        message: 'La latitud y longitud deben enviarse juntas.',
      });
    }
  }
}

export const attendanceCreateSchema = z
  .object({
    ...attendanceFields,
    hora_salida: attendanceFields.hora_salida.optional(),
    latitud_entrada: attendanceFields.latitud_entrada.optional(),
    longitud_entrada: attendanceFields.longitud_entrada.optional(),
    latitud_salida: attendanceFields.latitud_salida.optional(),
    longitud_salida: attendanceFields.longitud_salida.optional(),
    qr_code: attendanceFields.qr_code,
    observaciones: attendanceFields.observaciones,
  })
  .strict()
  .superRefine(hasPairedCoordinates);

export const attendanceUpdateSchema = z
  .object(attendanceFields)
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Debe proporcionar al menos un campo.',
  })
  .superRefine(hasPairedCoordinates);

export const creditCheckSchema = z
  .object({ amount: nonNegativeNumber })
  .strict();

export const creditTransactionSchema = z
  .object({
    monto: positiveNumber,
    tipo: z.enum(['compra', 'pago', 'ajuste']),
    descripcion: optionalText(1000),
    fecha: dateOrDateTime.optional(),
  })
  .strict();

export const posOrderUpdateSchema = updateSchema({
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: optionalText(2000),
  payment_method: z.enum(['cash', 'card', 'transfer', 'credit']),
  customer_id: uuid.nullable(),
});

export const signInSchema = z
  .object({
    username: requiredText(254),
    password: z.string().min(1).max(1024),
  })
  .strict();

export const modulePermissionSchema = z
  .object({
    user_id: uuid,
    module_id: uuid,
    can_view: z.boolean(),
    can_create: z.boolean(),
    can_edit: z.boolean(),
    can_delete: z.boolean(),
  })
  .strict()
  .refine(
    (permissions) =>
      permissions.can_view ||
      (!permissions.can_create &&
        !permissions.can_edit &&
        !permissions.can_delete),
    {
      path: ['can_view'],
      message: 'Los permisos de escritura requieren permiso de lectura.',
    }
  );

export const notificationPreferencesSchema = z
  .object({
    phone_e164: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, 'Usa un número internacional en formato E.164.')
      .nullable(),
    sms_opt_in: z.boolean(),
    whatsapp_opt_in: z.boolean(),
  })
  .strict()
  .superRefine((preferences, context) => {
    if (
      (preferences.sms_opt_in || preferences.whatsapp_opt_in) &&
      !preferences.phone_e164
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone_e164'],
        message: 'Agrega un teléfono para activar las alertas.',
      });
    }
  });

const reportSummaryEmailSchema = z
  .object({
    tipo: z.enum(['resumen', 'ventas', 'compras', 'inventario', 'asistencia']),
    periodo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2} a \d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const [start, end] = value.split(' a ');
        return (
          dateOnly.safeParse(start).success &&
          dateOnly.safeParse(end).success &&
          start <= end
        );
      }, 'El período debe contener fechas válidas y en orden.'),
    total_ventas: finiteNumber,
    total_compras: finiteNumber,
    total_ingresos_caja: finiteNumber,
    total_egresos_caja: finiteNumber,
    total_clientes: z.number().int().nonnegative(),
    total_proveedores: z.number().int().nonnegative(),
    total_productos: z.number().int().nonnegative(),
    total_asistencias: z.number().int().nonnegative(),
  })
  .strict();

export const reportEmailSchema = z
  .object({ report: reportSummaryEmailSchema })
  .strict();
