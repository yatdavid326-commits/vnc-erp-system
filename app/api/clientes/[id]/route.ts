import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeCustomer } from '@/lib/services/customers/authorization';
import { customerDatabaseError, customerFields, readCustomer } from '@/lib/services/customers/customerApi';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const auth = await authorizeCustomer(request, 'can_edit');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  const input = await readCustomer(request);
  if (input.error) return input.error;
  const { data, error } = await auth.client.from('customers')
    .update({ ...input.data, updated_at: new Date().toISOString() })
    .eq('id', id).select(customerFields).maybeSingle();
  if (error) return customerDatabaseError(error);
  if (!data) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await authorizeCustomer(request, 'can_delete');
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }
  const { data, error } = await auth.client.from('customers')
    .delete().eq('id', id).select('id').maybeSingle();
  if (error) return customerDatabaseError(error);
  if (!data) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
