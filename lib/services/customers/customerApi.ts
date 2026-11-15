import { NextResponse } from 'next/server';
import { customerSchema, type CustomerInput } from '@/lib/customers';

export const customerFields = 'id, customer_number, name, email, phone, nit_number, address, city, country, customer_type, is_active';

export function customerValues(input: CustomerInput) {
  return {
    ...input,
    email: input.email || null,
    phone: input.phone || null,
    nit_number: input.nit_number || null,
    address: input.address || null,
    city: input.city || null,
    country: input.country || null,
  };
}

export async function readCustomer(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 }) };
  }
  const result = customerSchema.safeParse(body);
  if (!result.success) {
    return { error: NextResponse.json({ error: 'Revisa los datos del cliente.' }, { status: 400 }) };
  }
  return { data: customerValues(result.data) };
}

export function customerDatabaseError(error: { code?: string }) {
  if (error.code === '23505') {
    return NextResponse.json({ error: 'El NIT o código de cliente ya existe.' }, { status: 409 });
  }
  if (error.code === '23503') {
    return NextResponse.json({ error: 'No se puede eliminar el cliente porque tiene registros relacionados.' }, { status: 409 });
  }
  console.error('Customer API database error:', error);
  return NextResponse.json({ error: 'No se pudo completar la operación de clientes.' }, { status: 500 });
}
