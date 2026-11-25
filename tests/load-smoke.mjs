import assert from 'node:assert/strict';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000';
const concurrency = Math.min(10, Math.max(1, Number(process.argv[3] ?? 5)));
const requestsPerWorker = Math.min(20, Math.max(1, Number(process.argv[4] ?? 10)));

const routes = [
  { path: '/login', method: 'GET' },
  { path: '/api/modules/all', method: 'GET' },
  { path: '/api/dashboard/metrics', method: 'GET' },
  { path: '/api/auth/signin', method: 'POST', body: { username: '', password: '' } },
];

async function runRequest(route) {
  const started = performance.now();
  const response = await fetch(new URL(route.path, baseUrl), {
    method: route.method,
    headers: route.body ? { 'Content-Type': 'application/json' } : undefined,
    body: route.body ? JSON.stringify(route.body) : undefined,
  });
  await response.arrayBuffer();
  return {
    status: response.status,
    duration: performance.now() - started,
  };
}

const start = performance.now();
const results = await Promise.all(
  Array.from({ length: concurrency }, async () =>
    Promise.all(
      Array.from({ length: requestsPerWorker }, async (_, index) =>
        runRequest(routes[index % routes.length])
      )
    )
  )
);
const flat = results.flat();
const durations = flat.map((result) => result.duration).sort((a, b) => a - b);
const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
const p95 = durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))];
const elapsed = performance.now() - start;
const statuses = Object.fromEntries(
  [...new Set(flat.map((result) => result.status))].map((status) => [
    status,
    flat.filter((result) => result.status === status).length,
  ])
);

assert.ok(flat.length === concurrency * requestsPerWorker);
assert.ok(durations.every((duration) => duration >= 0));

console.log(JSON.stringify({
  baseUrl,
  concurrency,
  requests: flat.length,
  elapsedMs: Math.round(elapsed),
  averageMs: Math.round(average),
  p95Ms: Math.round(p95),
  statuses,
}));
