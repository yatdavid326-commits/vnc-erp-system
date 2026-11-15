import { NextResponse } from 'next/server';
import { supplierSchema, type SupplierInput } from '@/lib/suppliers';

export const supplierFields = 'id, supplier_number, name, contact_person, email, phone, nit_number, address, city, country, payment_terms, is_active';

function supplierValues(input: SupplierInput) {
  return {
    ...input,
    contact_person: input.contact_person || null,
    email: input.email || null,
    phone: input.phone || null,
    nit_number: input.nit_number || null,
    address: input.address || null,
    city: input.city || null,
    country: input.country || null,
    payment_terms: input.payment_terms || null,
  };
}

export async function readSupplier(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 }) };
  }
  const result = supplierSchema.safeParse(body);
  if (!result.success) {
    return { error: NextResponse.json({ error: 'Revisa los datos del proveedor.' }, { status: 400 }) };
  }
  return { data: supplierValues(result.data) };
}

export function supplierDatabaseError(error: { code?: string }) {
  if (error.code === '23505') {
    return NextResponse.json({ error: 'El NIT o código de proveedor ya existe.' }, { status: 409 });
  }
  if (error.code === '23503') {
    return NextResponse.json({ error: 'No se puede eliminar el proveedor porque tiene registros relacionados.' }, { status: 409 });
  }
  console.error('Supplier API database error:', error);
  return NextResponse.json({ error: 'No se pudo completar la operación de proveedores.' }, { status: 500 });
}
