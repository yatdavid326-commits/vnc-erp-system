import {
  AuthenticatedProfileError,
  getAuthenticatedProfileId,
} from '@/lib/auth/getAuthenticatedProfileId';
import { posService, PosServiceError } from '@/lib/services/pos/posService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequestBody } from '@/lib/validation/requestBody';

const openingSchema = z
  .object({
    opening_balance: z.number().finite().nonnegative(),
  })
  .strict();

const closingSchema = z
  .object({
    closing_balance: z.number().finite().nonnegative(),
  })
  .strict();

function errorResponse(error: unknown, route: string) {
  if (error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof PosServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(`${route} error:`, error);
  return NextResponse.json(
    { error: 'No se pudo completar la operación de caja.' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const cashierId = await getAuthenticatedProfileId(request);
    const register = await posService.getOpenRegister(cashierId);
    return NextResponse.json(register);
  } catch (error) {
    return errorResponse(error, 'GET /api/pos/register');
  }
}

export async function POST(request: NextRequest) {
  const parsedBody = await validateRequestBody(request, openingSchema);
  if (!parsedBody.success) return parsedBody.response;

  try {
    const cashierId = await getAuthenticatedProfileId(request);
    const register = await posService.openRegister(
      cashierId,
      parsedBody.data.opening_balance
    );
    return NextResponse.json(register, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'POST /api/pos/register');
  }
}

export async function PATCH(request: NextRequest) {
  const parsedBody = await validateRequestBody(request, closingSchema);
  if (!parsedBody.success) return parsedBody.response;

  try {
    const cashierId = await getAuthenticatedProfileId(request);
    const register = await posService.closeRegister(
      cashierId,
      parsedBody.data.closing_balance
    );
    return NextResponse.json(register);
  } catch (error) {
    return errorResponse(error, 'PATCH /api/pos/register');
  }
}
