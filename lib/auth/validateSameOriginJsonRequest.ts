import { NextResponse } from 'next/server.js';

export function validateSameOriginJsonRequest(
  request: Request,
  expectedOrigin: string
): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
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
