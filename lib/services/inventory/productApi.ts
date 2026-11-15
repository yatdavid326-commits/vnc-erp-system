import { NextResponse } from 'next/server';
import { productSchema } from '@/lib/products';

export const productFields = 'id, product_code, name, description, unit_of_measure, cost_price, selling_price, reorder_level, is_active, inventory(quantity_on_hand, quantity_reserved)';

export async function readProduct(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: 'Los datos enviados no son válidos.' }, { status: 400 }) };
  }
  const result = productSchema.safeParse(body);
  if (!result.success) {
    return { error: NextResponse.json({ error: 'Revisa los datos del producto y sus precios.' }, { status: 400 }) };
  }
  return { data: { ...result.data, description: result.data.description || null } };
}

export function productDatabaseError(error: { code?: string }) {
  if (error.code === '23505') {
    return NextResponse.json({ error: 'El código de producto ya existe.' }, { status: 409 });
  }
  if (error.code === '23503') {
    return NextResponse.json({ error: 'No se puede eliminar el producto porque tiene registros relacionados.' }, { status: 409 });
  }
  console.error('Product API database error:', error);
  return NextResponse.json({ error: 'No se pudo completar la operación de productos.' }, { status: 500 });
}
