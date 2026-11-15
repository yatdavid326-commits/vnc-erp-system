import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeModule } from '@/lib/services/modules/authorization';
import { supplierDatabaseError, supplierFields, readSupplier } from '@/lib/services/suppliers/supplierApi';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'suppliers', 'can_edit');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  const input = await readSupplier(request);
  if (input.error) return input.error;
  const { data, error } = await auth.client.from('suppliers')
    .update({ ...input.data, updated_at: new Date().toISOString() })
    .eq('id', id).select(supplierFields).maybeSingle();
  if (error) return supplierDatabaseError(error);
  if (!data) return NextResponse.json({ error: 'Proveedor no encontrado.' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await authorizeModule(request, 'suppliers', 'can_delete');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  const { data, error } = await auth.client.from('suppliers')
    .delete().eq('id', id).select('id').maybeSingle();
  if (error) return supplierDatabaseError(error);
  if (!data) return NextResponse.json({ error: 'Proveedor no encontrado.' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
