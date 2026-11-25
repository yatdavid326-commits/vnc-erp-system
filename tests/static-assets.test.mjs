import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'production';
const { default: nextConfig } = await import('../next.config.ts');

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

test('public assets contain no Next/Vercel demo files', () => {
  const names = readdirSync(publicDir);
  assert.equal(names.includes('next.svg'), false);
  assert.equal(names.includes('globe.svg'), false);
  assert.equal(names.includes('window.svg'), false);
  assert.equal(names.includes('file.svg'), false);
  assert.equal(names.includes('vercel.svg'), false);
});

test('application favicon remains available', () => {
  assert.equal(existsSync(fileURLToPath(new URL('../app/favicon.ico', import.meta.url))), true);
});

test('static assets use CDN-friendly cache headers', async () => {
  const headers = await nextConfig.headers();
  const cacheFor = (source) =>
    headers.find((rule) => rule.source === source)?.headers.find(
      (header) => header.key === 'Cache-Control'
    )?.value;

  assert.equal(
    cacheFor('/_next/static/:path*'),
    'public, max-age=31536000, immutable'
  );
  assert.equal(cacheFor('/favicon.ico'), 'public, max-age=86400');
  assert.match(
    cacheFor('/:path*.{svg,png,jpg,jpeg,webp,avif,ico}'),
    /max-age=604800/
  );
});
