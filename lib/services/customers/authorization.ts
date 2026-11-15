import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export type CustomerPermission = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export async function authorizeCustomer(request: Request, permission: CustomerPermission) {
  if (!supabaseAdmin) {
    console.error('Customer API: admin client is unavailable');
    return { error: NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 }) };
  }
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ') || !header.slice(7).trim()) {
    return { error: NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 }) };
  }
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(header.slice(7));
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles').select('id, is_active').eq('auth_id', user.id).maybeSingle();
  if (profileError) {
    console.error('Customer API: profile lookup failed', profileError);
    return { error: NextResponse.json({ error: 'No se pudieron verificar los permisos.' }, { status: 500 }) };
  }
  if (!profile?.is_active) {
    return { error: NextResponse.json({ error: 'No tienes acceso a Clientes.' }, { status: 403 }) };
  }
  const { data: access, error: accessError } = await supabaseAdmin
    .from('user_modules')
    .select('can_view, can_create, can_edit, can_delete, module:modules!inner(name, is_active)')
    .eq('user_id', profile.id)
    .eq('module.name', 'clients')
    .eq('module.is_active', true)
    .maybeSingle();
  if (accessError) {
    console.error('Customer API: permission lookup failed', accessError);
    return { error: NextResponse.json({ error: 'No se pudieron verificar los permisos.' }, { status: 500 }) };
  }
  if (!access?.can_view || !access[permission]) {
    return { error: NextResponse.json({ error: 'No tienes permiso para esta acción.' }, { status: 403 }) };
  }
  return { client: supabaseAdmin };
}
