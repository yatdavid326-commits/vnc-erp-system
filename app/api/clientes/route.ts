import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authorizeCustomer } from '@/lib/services/customers/authorization';
import { customerDatabaseError, customerFields, readCustomer } from '@/lib/services/customers/customerApi';

const pageSize = 25;

export async function GET(request: Request) {
  const auth = await authorizeCustomer(request, 'can_view');
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const rawPage = params.get('page') ?? '1';
  if (!/^[1-9]\d{0,5}$/.test(rawPage)) {
    return NextResponse.json({ error: 'Página inválida.' }, { status: 400 });
  }
  const search = (params.get('search') ?? '').trim();
  const status = params.get('status') ?? 'all';
  if (search.length > 100 || /[\u0000-\u001f\u007f]/.test(search) ||
      !['all', 'active', 'inactive'].includes(status)) {
    return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400 });
  }
  const page = Number(rawPage);
  let query = auth.client.from('customers').select(customerFields, { count: 'exact' });
  if (search) query = query.ilike('name', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.or('is_active.is.null,is_active.eq.false');
  const { data, error, count } = await query
    .order('created_at', { ascending: false }).order('id')
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return customerDatabaseError(error);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(request: Request) {
  const auth = await authorizeCustomer(request, 'can_create');
  if (auth.error) return auth.error;
  const input = await readCustomer(request);
  if (input.error) return input.error;
  const { data, error } = await auth.client.from('customers')
    .insert({ ...input.data, customer_number: `CLI-${randomUUID()}` })
    .select(customerFields).single();
  if (error) return customerDatabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
