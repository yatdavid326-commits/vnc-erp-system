import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/constants';
import {
  canAccessAdminApi,
  getRequiredApiPermission,
  isAdminApiPath,
  selfServiceApiPaths,
} from '@/lib/auth/apiPermissions';
import { supabaseAdmin } from '@/lib/db/supabase';

const publicApiPaths = new Set([
  '/api/auth/signin',
  '/api/auth/session',
  '/api/auth/signout',
  '/api/cron/notifications',
  '/api/modules/all',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/') || publicApiPaths.has(pathname)) {
    return NextResponse.next();
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase authentication is not configured.');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (selfServiceApiPaths.has(pathname)) {
    return NextResponse.next();
  }

  const requirement = getRequiredApiPermission(pathname, request.method);
  const isAdminApi = isAdminApiPath(pathname);
  if (!requirement && !isAdminApi) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client is not configured.');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('id, role, is_active')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error checking API permissions:', profileError);
    return NextResponse.json(
      { error: 'Authorization check failed' },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (profile.is_active !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (isAdminApi && !canAccessAdminApi(pathname, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (profile.role === 'admin') {
    return NextResponse.next();
  }

  if (isAdminApi || !requirement) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: moduleAccess, error: accessError } = await supabaseAdmin
    .from('user_modules')
    .select(
      'can_view, can_create, can_edit, can_delete, module:modules!inner(name, is_active)'
    )
    .eq('module.name', requirement.moduleName)
    .eq('module.is_active', true)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (accessError) {
    console.error('Error checking module permissions:', accessError);
    return NextResponse.json(
      { error: 'Authorization check failed' },
      { status: 500 }
    );
  }

  if (moduleAccess?.[requirement.permission] !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|_rsc).*)',
  ],
};
