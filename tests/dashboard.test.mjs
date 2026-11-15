import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';

const source = readFileSync(new URL('../app/dashboard/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test('dashboard identifies unavailable data instead of displaying invented business figures', () => {
  const exports = {};
  const require = createRequire(import.meta.url);
  runInNewContext(compiled, {
    exports,
    require: (name) => name === '@/hooks'
      ? { useAuthStore: () => ({ user: { full_name: 'Usuario de prueba' } }) }
      : require(name),
  });

  const html = renderToStaticMarkup(createElement(exports.default));
  assert.match(html, /Bienvenido, Usuario de prueba/);
  assert.match(html, /métricas reales todavía no están conectadas/);
  assert.equal((html.match(/No disponible/g) || []).length, 4);
  assert.equal((html.match(/Datos reales aún no disponibles/g) || []).length, 2);
  assert.doesNotMatch(html, /45,230|128,450|Factura #100|PRD-100/);
});
