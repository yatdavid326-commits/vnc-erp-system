import { NextRequest, NextResponse } from 'next/server';
import { customerService, CreditTransactionError } from '@/lib/services/customers/customerService';
import { getAuthenticatedProfileId, AuthenticatedProfileError } from '@/lib/auth/getAuthenticatedProfileId';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { creditTransactionSchema } from '@/lib/validation/requestSchemas';
import { z } from 'zod';

function errorResponse(error: unknown, route: string) {
  if (error instanceof CreditTransactionError || error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${route} error:`, error);
  return NextResponse.json({ error: 'No se pudo completar la operación de crédito.' }, { status: 500 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Identificador de cliente no válido.' }, { status: 400 });
    }
    const rawLimit = request.nextUrl.searchParams.get('limit') ?? '100';
    const limit = Number(rawLimit);
    if (!/^\d+$/.test(rawLimit) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'El límite debe estar entre 1 y 100.' }, { status: 400 });
    }
    if (!await customerService.getById(id)) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    }

    const transactions = await customerService.getCreditTransactions(id, limit);

    return NextResponse.json(transactions);
  } catch (error) {
    return errorResponse(error, 'GET /api/clientes/[id]/transactions');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Identificador de cliente no válido.' }, { status: 400 });
    }
    const parsedBody = await validateRequestBody(
      request,
      creditTransactionSchema
    );
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    const userId = await getAuthenticatedProfileId(request);

    const transaction = await customerService.addCreditTransaction({
      id: body.id,
      cliente_id: id,
      monto: body.monto,
      tipo: body.tipo,
      descripcion: body.descripcion,
      fecha: body.fecha,
    }, userId);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'POST /api/clientes/[id]/transactions');
  }
}
