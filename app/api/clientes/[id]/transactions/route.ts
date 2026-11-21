import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { creditTransactionSchema } from '@/lib/validation/requestSchemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const transactions = await customerService.getCreditTransactions(id, limit);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('GET /api/clientes/[id]/transactions error:', error);
    return NextResponse.json(
      { error: 'Error fetching transactions', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedBody = await validateRequestBody(
      request,
      creditTransactionSchema
    );
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const transaction = await customerService.addCreditTransaction({
      cliente_id: id,
      monto: body.monto,
      tipo: body.tipo,
      descripcion: body.descripcion,
      fecha: body.fecha || new Date().toISOString(),
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('POST /api/clientes/[id]/transactions error:', error);
    return NextResponse.json(
      { error: 'Error creating transaction', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
