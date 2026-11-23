import assert from 'node:assert/strict';
import test from 'node:test';
import { NextResponse } from 'next/server.js';
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  createSignInResponse,
  REFRESH_TOKEN_COOKIE,
} from '../lib/auth/sessionCookies.ts';
import { validateSameOriginJsonRequest } from '../lib/auth/validateSameOriginJsonRequest.ts';

test('sign-in request protection accepts same-origin JSON behind a proxy', () => {
  const request = new Request('http://localhost:3000/api/auth/signin', {
    method: 'POST',
    headers: {
      Host: 'erp.example.com',
      'X-Forwarded-Proto': 'https',
      Origin: 'https://erp.example.com',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  assert.equal(validateSameOriginJsonRequest(request), null);
});

test('sign-in request protection rejects missing and cross-origin origins', () => {
  const requests = [
    new Request('https://erp.example.com/api/auth/signin', {
      method: 'POST',
      headers: { Host: 'erp.example.com', 'Content-Type': 'application/json' },
      body: '{}',
    }),
    new Request('https://erp.example.com/api/auth/signin', {
      method: 'POST',
      headers: {
        Host: 'erp.example.com',
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
      },
      body: '{}',
    }),
    new Request('https://erp.example.com/api/auth/signin', {
      method: 'POST',
      headers: {
        Origin: 'https://erp.example.com',
        'Content-Type': 'application/json',
      },
      body: '{}',
    }),
    new Request('https://erp.example.com/api/auth/signin', {
      method: 'POST',
      headers: {
        Host: 'erp.example.com',
        Origin: 'https://erp.example.com',
        'X-Forwarded-Proto': 'invalid',
        'Content-Type': 'application/json',
      },
      body: '{}',
    }),
  ];

  for (const request of requests) {
    const response = validateSameOriginJsonRequest(request);
    assert.equal(response?.status, 403);
  }
});

test('sign-in request protection rejects form content types', () => {
  const request = new Request('https://erp.example.com/api/auth/signin', {
    method: 'POST',
    headers: {
      Host: 'erp.example.com',
      Origin: 'https://erp.example.com',
      'Content-Type': 'text/plain',
    },
    body: '{"username":"admin","password":"secret"}',
  });

  const response = validateSameOriginJsonRequest(request);
  assert.equal(response?.status, 415);
});

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
