import { NextRequest, NextResponse } from 'next/server';
import { createClient, type Session, type User } from '@supabase/supabase-js';
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from '@/lib/auth/sessionCookies';
import {
  canAccessAdminApi,
  getRequiredApiPermissions,
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/') || publicApiPaths.has(pathname)) {
    return NextResponse.next();
  }

  const authorization = request.headers.get('authorization');
  const hasBearerToken = authorization?.startsWith('Bearer ') ?? false;
  let accessToken = hasBearerToken
    ? authorization?.slice('Bearer '.length)
    : request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = hasBearerToken
    ? undefined
    : request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
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

  let user: User | null = null;
  let refreshedSession: Session | null = null;
  if (accessToken) {
    const {
      data: { user: accessUser },
      error,
    } = await supabase.auth.getUser(accessToken);
    if (!error) user = accessUser;
  }

  if (!user && refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) {
      console.error('Error refreshing authentication session:', error);
      if (error.status !== 400 && error.status !== 401) {
        return NextResponse.json(
          { error: 'Authentication service unavailable' },
          { status: 503 }
        );
      }

      const response = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    refreshedSession = data.session;
    user = data.user ?? data.session?.user ?? null;
    accessToken = data.session?.access_token;
  }

  if (!user || !accessToken) {
    const response = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
    if (!hasBearerToken) clearAuthCookies(response);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('authorization', `Bearer ${accessToken}`);
  const withSessionCookies = (response: NextResponse) =>
    refreshedSession ? setAuthCookies(response, refreshedSession) : response;
  const next = () =>
    withSessionCookies(
      NextResponse.next({ request: { headers: requestHeaders } })
    );
  const fail = (error: string, status: number) =>
    withSessionCookies(NextResponse.json({ error }, { status }));

  if (selfServiceApiPaths.has(pathname)) {
    return next();
  }

  const requirements = getRequiredApiPermissions(pathname, request.method);
  const isAdminApi = isAdminApiPath(pathname);
  if (requirements.length === 0 && !isAdminApi) {
    return fail('Forbidden', 403);
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client is not configured.');
    return fail('Server configuration error', 500);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('id, role, is_active')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error checking API permissions:', profileError);
    return fail('Authorization check failed', 500);
  }

  if (!profile) {
    return fail('Forbidden', 403);
  }

  if (profile.is_active !== true) {
    return fail('Forbidden', 403);
  }

  if (isAdminApi && !canAccessAdminApi(pathname, profile)) {
    return fail('Forbidden', 403);
  }

  if (profile.role === 'admin') {
    return next();
  }

  if (isAdminApi || requirements.length === 0) {
    return fail('Forbidden', 403);
  }

  for (const requirement of requirements) {
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
      return fail('Authorization check failed', 500);
    }

    if (moduleAccess?.[requirement.permission] !== true) {
      return fail('Forbidden', 403);
    }
  }

  return next();
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
