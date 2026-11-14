import { NextRequest, NextResponse } from 'next/server';
import { customerService } from '@/lib/services/customers/customerService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if credit is available
    const isAvailable = await customerService.isCreditAvailable(id, body.amount || 0);

    return NextResponse.json({
      cliente_id: id,
      available: isAvailable,
      requested: body.amount || 0,
    });
  } catch (error) {
    console.error('POST /api/clientes/[id]/credit error:', error);
    return NextResponse.json(
      { error: 'Error checking credit', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
