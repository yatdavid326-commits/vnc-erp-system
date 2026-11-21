import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { creditCheckSchema } from '@/lib/validation/requestSchemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const balance = await customerService.getCreditBalance(id);

    return NextResponse.json({ cliente_id: id, balance });
  } catch (error) {
    console.error('GET /api/clientes/[id]/credit error:', error);
    return NextResponse.json(
      { error: 'Error fetching credit balance', details: error instanceof Error ? error.message : '' },
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
    const parsedBody = await validateRequestBody(request, creditCheckSchema);
    if (!parsedBody.success) return parsedBody.response;

    // Check if credit is available
    const isAvailable = await customerService.isCreditAvailable(
      id,
      parsedBody.data.amount
    );

    return NextResponse.json({
      cliente_id: id,
      available: isAvailable,
      requested: parsedBody.data.amount,
    });
  } catch (error) {
    console.error('POST /api/clientes/[id]/credit error:', error);
    return NextResponse.json(
      { error: 'Error checking credit', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
