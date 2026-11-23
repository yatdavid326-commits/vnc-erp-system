import { NextResponse } from 'next/server.js';

export function validateSameOriginJsonRequest(
  request: Request
): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const protocol =
    request.headers.get('x-forwarded-proto') ??
    new URL(request.url).protocol.slice(0, -1);
  if (!origin || !host || (protocol !== 'https' && protocol !== 'http')) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  let requestOrigin: string;
  let expectedOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
    expectedOrigin = new URL(`${protocol}://${host}`).origin;
  } catch {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  if (requestOrigin !== expectedOrigin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const contentType = request.headers
    .get('content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  return null;
}
