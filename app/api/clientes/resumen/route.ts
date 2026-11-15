import { NextResponse } from 'next/server';
import { authorizeCustomer } from '@/lib/services/customers/authorization';

export async function GET(request: Request) {
  const auth = await authorizeCustomer(request, 'can_view');
  if (auth.error) return auth.error;

  const { count, error } = await auth.client.from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (error || count === null) {
    console.error('Customer summary failed:', error ?? 'Missing count');
    return NextResponse.json({ error: 'No se pudo consultar el resumen de clientes.' }, { status: 500 });
  }
  return NextResponse.json({ active_customers: count }, { headers: { 'Cache-Control': 'no-store' } });
}
