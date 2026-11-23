import assert from 'node:assert/strict';
import test from 'node:test';
import { NextResponse } from 'next/server.js';
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  createSignInResponse,
  REFRESH_TOKEN_COOKIE,
} from '../lib/auth/sessionCookies.ts';

test('sign-in keeps tokens out of JSON and sets both HttpOnly cookies', async () => {
  const response = createSignInResponse({
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
  });

  assert.deepEqual(await response.json(), { authenticated: true });

  const accessCookie = response.cookies.get(ACCESS_TOKEN_COOKIE);
  const refreshCookie = response.cookies.get(REFRESH_TOKEN_COOKIE);
  assert.equal(accessCookie?.value, 'test-access-token');
  assert.equal(accessCookie?.httpOnly, true);
  assert.equal(accessCookie?.maxAge, 3600);
  assert.equal(refreshCookie?.value, 'test-refresh-token');
  assert.equal(refreshCookie?.httpOnly, true);
  assert.ok((refreshCookie?.maxAge ?? 0) > (accessCookie?.maxAge ?? 0));
});

test('sign-out clears both session cookies', () => {
  const response = clearAuthCookies(NextResponse.json({ success: true }));

  assert.equal(response.cookies.get(ACCESS_TOKEN_COOKIE)?.maxAge, 0);
  assert.equal(response.cookies.get(REFRESH_TOKEN_COOKIE)?.maxAge, 0);
});
