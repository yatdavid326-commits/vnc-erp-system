import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeModule } from '@/lib/services/modules/authorization';
import { productDatabaseError, productFields, readProduct } from '@/lib/services/inventory/productApi';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'inventory', 'can_edit');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  const input = await readProduct(request);
  if (input.error) return input.error;
  const { data, error } = await auth.client.from('products')
    .update({ ...input.data, updated_at: new Date().toISOString() })
    .eq('id', id).select(productFields).maybeSingle();
  if (error) return productDatabaseError(error);
  if (!data) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'inventory', 'can_delete');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  const { data, error } = await auth.client.from('products')
    .delete().eq('id', id).select('id').maybeSingle();
  if (error) return productDatabaseError(error);
  if (!data) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
