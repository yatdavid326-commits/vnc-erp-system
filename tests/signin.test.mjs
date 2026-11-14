import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/services/auth/serverSignIn.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function createSignIn(fetchMock, setSession) {
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.equal(name, '@/lib/db/supabase');
      return { supabase: { auth: { setSession } } };
    },
    fetch: fetchMock,
    console: { error() {} },
  });
  return exports.serverSignIn;
}

test('establishes the browser session after a successful sign-in', async () => {
  let received;
  const signIn = createSignIn(
    async () => ({
      ok: true,
      json: async () => ({ session: { access_token: 'access', refresh_token: 'refresh' } }),
    }),
    async (tokens) => {
      received = tokens;
      return { data: { session: tokens }, error: null };
    },
  );
  const result = await signIn('user', 'password');
  assert.equal(result.error, null);
  assert.equal(received.access_token, 'access');
  assert.equal(received.refresh_token, 'refresh');
  assert.ok(result.data.session);
});

test('does not establish a session for invalid credentials or incomplete tokens', async () => {
  let calls = 0;
  const setSession = async () => { calls++; };
  const rejected = createSignIn(
    async () => ({ ok: false, json: async () => ({ error: 'Invalid credentials' }) }),
    setSession,
  );
  assert.equal((await rejected('user', 'wrong')).error.message, 'Invalid credentials');

  const missingToken = createSignIn(
    async () => ({ ok: true, json: async () => ({ session: { access_token: 'access' } }) }),
    setSession,
  );
  assert.ok((await missingToken('user', 'password')).error);
  assert.equal(calls, 0);
});

test('reports failure when the browser session cannot be established', async () => {
  const signIn = createSignIn(
    async () => ({
      ok: true,
      json: async () => ({ session: { access_token: 'access', refresh_token: 'refresh' } }),
    }),
    async () => ({ data: { session: null }, error: { message: 'Session rejected' } }),
  );
  assert.ok((await signIn('user', 'password')).error);
});
