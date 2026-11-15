import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export type ModulePermission = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
export type ProtectedModule = 'clients' | 'suppliers' | 'inventory' | 'purchases' | 'reports';

export async function authorizeModule(request: Request, moduleName: ProtectedModule, permission: ModulePermission) {
  if (!supabaseAdmin) {
    console.error('Module API: admin client is unavailable');
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
    console.error('Module API: profile lookup failed', profileError);
    return { error: NextResponse.json({ error: 'No se pudieron verificar los permisos.' }, { status: 500 }) };
  }
  if (!profile?.is_active) {
    return { error: NextResponse.json({ error: 'No tienes acceso a este módulo.' }, { status: 403 }) };
  }
  const { data: access, error: accessError } = await supabaseAdmin
    .from('user_modules')
    .select('can_view, can_create, can_edit, can_delete, module:modules!inner(name, is_active)')
    .eq('user_id', profile.id)
    .eq('module.name', moduleName)
    .eq('module.is_active', true)
    .maybeSingle();
  if (accessError) {
    console.error('Module API: permission lookup failed', accessError);
    return { error: NextResponse.json({ error: 'No se pudieron verificar los permisos.' }, { status: 500 }) };
  }
  if (!access?.can_view || !access[permission]) {
    return { error: NextResponse.json({ error: 'No tienes permiso para esta acción.' }, { status: 403 }) };
  }
  return { client: supabaseAdmin, profileId: profile.id };
}
