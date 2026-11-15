import { NextResponse } from 'next/server';
import { authorizeModule } from '@/lib/services/modules/authorization';

export async function GET(request: Request) {
  const auth = await authorizeModule(request, 'purchases', 'can_create');
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  const search = (params.get('search') ?? '').trim();
  if (!['suppliers', 'products'].includes(kind ?? '') || search.length > 100 || /[\u0000-\u001f\u007f]/.test(search)) {
    return NextResponse.json({ error: 'Búsqueda inválida.' }, { status: 400 });
  }
  const table = kind === 'suppliers' ? 'suppliers' : 'products';
  const { data, error } = await auth.client.from(table).select('id, name')
    .eq('is_active', true).ilike('name', `%${search.replace(/[\\%_]/g, '\\$&')}%`)
    .order('name').order('id').limit(25);
  if (error) {
    console.error('Purchase options failed:', error);
    return NextResponse.json({ error: 'No se pudieron consultar las opciones.' }, { status: 500 });
  }
  return NextResponse.json({ data });
}
