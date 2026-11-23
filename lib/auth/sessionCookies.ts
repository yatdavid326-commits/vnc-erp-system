import { NextResponse } from 'next/server.js';
import type { Session } from '@supabase/supabase-js';

export const ACCESS_TOKEN_COOKIE = 'sb-access-token';
export const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(
  response: NextResponse,
  session: Pick<Session, 'access_token' | 'refresh_token' | 'expires_in'>
): NextResponse {
  setAccessTokenCookie(response, session.access_token, session.expires_in);
  response.cookies.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  return response;
}

export function setAccessTokenCookie(
  response: NextResponse,
  accessToken: string,
  maxAge: number
): NextResponse {
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge,
  });
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    response.cookies.set(name, '', { ...cookieOptions, maxAge: 0 });
  }
  return response;
}

export function createSignInResponse(
  session: Pick<Session, 'access_token' | 'refresh_token' | 'expires_in'>
): NextResponse {
  return setAuthCookies(
    NextResponse.json({ authenticated: true }),
    session
  );
}
