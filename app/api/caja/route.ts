import { getAuthenticatedProfileId, AuthenticatedProfileError } from '@/lib/auth/getAuthenticatedProfileId';
import { supabaseAdmin } from '@/lib/db/supabase';
import { posService } from '@/lib/services/pos/posService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { cashMovementFormSchema } from '@/lib/validation/requestSchemas';
import { NextRequest, NextResponse } from 'next/server';

type CashMovementRow = {
  id: string;
  movement_type: string;
  amount: number | string;
  reference_number: string | null;
  description: string | null;
  movement_date: string;
  created_at: string;
};

function mapMovement(row: CashMovementRow) {
  return {
    id: row.id,
    tipo: row.movement_type,
    concepto: row.description ?? '',
    monto: Number(row.amount),
    referencia: row.reference_number ?? '',
    fecha: row.movement_date,
    created_at: row.created_at,
  };
}

function authErrorResponse(error: unknown) {
  if (error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('Cash movement API error:', error);
  return NextResponse.json({ error: 'No se pudo completar la operación de caja.' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const cashierId = await getAuthenticatedProfileId(request);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const register = await posService.getOpenRegister(cashierId);
    if (!register) {
      return NextResponse.json({ error: 'Abre una caja antes de consultar sus movimientos.' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('cash_movements')
      .select('id, movement_type, amount, reference_number, description, movement_date, created_at')
      .eq('cash_register_id', register.id)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json((data ?? []).map((row) => mapMovement(row as CashMovementRow)));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const parsedBody = await validateRequestBody(request, cashMovementFormSchema);
  if (!parsedBody.success) return parsedBody.response;

  try {
    const cashierId = await getAuthenticatedProfileId(request);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const register = await posService.getOpenRegister(cashierId);
    if (!register) {
      return NextResponse.json({ error: 'Abre una caja antes de registrar movimientos.' }, { status: 409 });
    }

    const input = parsedBody.data;
    const { data, error } = await supabaseAdmin
      .from('cash_movements')
      .insert({
        cash_register_id: register.id,
        movement_type: input.tipo,
        amount: input.monto,
        description: input.concepto,
        reference_number: input.referencia || null,
        movement_date: input.fecha,
        created_by: cashierId,
      })
      .select('id, movement_type, amount, reference_number, description, movement_date, created_at')
      .single();
    if (error) throw error;

    return NextResponse.json(mapMovement(data as CashMovementRow), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
