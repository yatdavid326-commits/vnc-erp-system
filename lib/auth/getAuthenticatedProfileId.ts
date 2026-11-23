import { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/sessionCookies';
import { supabaseAdmin } from '@/lib/db/supabase';

export class AuthenticatedProfileError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'AuthenticatedProfileError';
  }
}

export interface AuthenticatedProfileIdentity {
  id: string;
  authId: string;
  email: string | null;
}

export async function getAuthenticatedProfileIdentity(
  request: NextRequest
): Promise<AuthenticatedProfileIdentity> {
  if (!supabaseAdmin) {
    throw new AuthenticatedProfileError('Server configuration error', 500);
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    throw new AuthenticatedProfileError('Unauthorized', 401);
  }

  const {
    data: { user },
    error: tokenError,
  } = await supabaseAdmin.auth.getUser(token);

  if (tokenError || !user) {
    throw new AuthenticatedProfileError('Invalid token', 401);
  }

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, is_active')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile || !profile.is_active) {
    throw new AuthenticatedProfileError('Active user profile not found', 403);
  }

  return {
    id: profile.id,
    authId: user.id,
    email: typeof user.email === 'string' ? user.email : null,
  };
}

export async function getAuthenticatedProfileId(
  request: NextRequest
): Promise<string> {
  const profile = await getAuthenticatedProfileIdentity(request);
  return profile.id;
}
