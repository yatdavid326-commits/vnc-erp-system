import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const apiRoot = join(projectRoot, 'app', 'api');
const spec = JSON.parse(
  readFileSync(join(projectRoot, 'docs', 'openapi.json'), 'utf8')
);
const httpMethods = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

function getRouteHandlers(directory = apiRoot) {
  const handlers = new Map();

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [route, methods] of getRouteHandlers(filePath)) {
        handlers.set(route, methods);
      }
      continue;
    }

    if (entry.name !== 'route.ts') continue;

    const relativeDirectory = relative(apiRoot, dirname(filePath))
      .split(sep)
      .join('/');
    const route = (`/api/${relativeDirectory}`).replace(
      /\[([^\]]+)\]/g,
      '{$1}'
    );
    const source = readFileSync(filePath, 'utf8');
    const methods = new Set(
      [...source.matchAll(
        /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g
      )].map((match) => match[1].toLowerCase())
    );
    handlers.set(route, methods);
  }

  return handlers;
}

function resolveLocalReference(reference) {
  assert.ok(reference.startsWith('#/'), `Expected local reference: ${reference}`);
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((current, key) => current?.[key], spec);
}

test('OpenAPI contract covers every API route and resolves local references', () => {
  assert.equal(spec.openapi, '3.1.0');

  const routeHandlers = getRouteHandlers();
  for (const [route, methods] of routeHandlers) {
    assert.ok(spec.paths[route], `Missing OpenAPI path ${route}`);
    for (const method of methods) {
      assert.ok(
        spec.paths[route][method],
        `Missing OpenAPI operation ${method.toUpperCase()} ${route}`
      );
    }
  }

  for (const [route, pathItem] of Object.entries(spec.paths)) {
    assert.ok(routeHandlers.has(route), `No route handler for ${route}`);
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!httpMethods.has(method)) continue;
      assert.ok(operation.operationId, `Missing operationId for ${method} ${route}`);
      assert.ok(
        operation.responses && Object.keys(operation.responses).length > 0,
        `Missing responses for ${method} ${route}`
      );
    }
  }

  const operationIds = Object.values(spec.paths).flatMap((pathItem) =>
    Object.entries(pathItem)
      .filter(([method]) => httpMethods.has(method))
      .map(([, operation]) => operation.operationId)
  );
  assert.equal(new Set(operationIds).size, operationIds.length);

  function visit(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref') {
        assert.ok(resolveLocalReference(child), `Unresolved reference ${child}`);
      } else {
        visit(child);
      }
    }
  }

  visit(spec);
});
