import { getAuthenticatedProfileId, AuthenticatedProfileError } from '@/lib/auth/getAuthenticatedProfileId';
import { posService, PosServiceError } from '@/lib/services/pos/posService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequestBody } from '@/lib/validation/requestBody';

const checkoutSchema = z
  .object({
    customer_id: z.string().uuid().nullable().default(null),
    payment_method: z.enum(['efectivo', 'tarjeta', 'cheque']),
    amount_paid: z.number().finite().nonnegative().default(0),
    items: z
      .array(
        z.object({
          inventory_id: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1),
  })
  .strict();

function getPagination(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    return { error: 'page must be a positive integer' } as const;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: 'limit must be an integer between 1 and 100' } as const;
  }
  return { page, limit } as const;
}

function errorResponse(error: unknown, route: string) {
  if (error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof PosServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(`${route} error:`, error);
  return NextResponse.json(
    { error: 'No se pudo completar la operación de POS.' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  const pagination = getPagination(request);
  if ('error' in pagination) {
    return NextResponse.json({ error: pagination.error }, { status: 400 });
  }

  try {
    const result = await posService.getAll(pagination.page, pagination.limit);
    return NextResponse.json(result.data, {
      headers: { 'X-Total-Count': result.count.toString() },
    });
  } catch (error) {
    return errorResponse(error, 'GET /api/pos');
  }
}

export async function POST(request: NextRequest) {
  const parsedBody = await validateRequestBody(request, checkoutSchema);
  if (!parsedBody.success) return parsedBody.response;

  try {
    const userId = await getAuthenticatedProfileId(request);
    const sale = await posService.createSale(userId, parsedBody.data);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'POST /api/pos');
  }
}
