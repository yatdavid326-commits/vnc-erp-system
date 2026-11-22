import { getAuthenticatedProfileId, AuthenticatedProfileError } from '@/lib/auth/getAuthenticatedProfileId';
import { supabaseAdmin } from '@/lib/db/supabase';
import { posService } from '@/lib/services/pos/posService';
import { sanitizePostgrestSearch } from '@/lib/utils/search';
import { parsePaginationParams } from '@/lib/utils/pagination';
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

    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePaginationParams(searchParams);
    if ('error' in pagination) {
      return NextResponse.json({ error: pagination.error }, { status: 400 });
    }

    const movementType = searchParams.get('tipo');
    const dateFrom = searchParams.get('desde');
    const dateTo = searchParams.get('hasta');
    const search = sanitizePostgrestSearch(searchParams.get('search') ?? '');
    const validDate = (date: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const parsed = new Date(`${date}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
    };

    if (movementType && movementType !== 'ingreso' && movementType !== 'egreso') {
      return NextResponse.json({ error: 'Tipo de movimiento no válido.' }, { status: 400 });
    }
    if ((dateFrom && !validDate(dateFrom)) || (dateTo && !validDate(dateTo))) {
      return NextResponse.json({ error: 'Fecha no válida.' }, { status: 400 });
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json({ error: 'El rango de fechas no es válido.' }, { status: 400 });
    }

    let movementsQuery = supabaseAdmin
      .from('cash_movements')
      .select('id, movement_type, amount, reference_number, description, movement_date, created_at', { count: 'exact' })
      .eq('cash_register_id', register.id)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (movementType) movementsQuery = movementsQuery.eq('movement_type', movementType);
    if (dateFrom) movementsQuery = movementsQuery.gte('movement_date', dateFrom);
    if (dateTo) movementsQuery = movementsQuery.lte('movement_date', dateTo);
    if (search) {
      movementsQuery = movementsQuery.or(
        `description.ilike.%${search}%,reference_number.ilike.%${search}%`
      );
    }

    const [movements, summary] = await Promise.all([
      movementsQuery.range(
        (pagination.page - 1) * pagination.limit,
        pagination.page * pagination.limit - 1
      ),
      supabaseAdmin
        .from('cash_movements')
        .select('movement_type, amount')
        .eq('cash_register_id', register.id),
    ]);
    if (movements.error) throw movements.error;
    if (summary.error) throw summary.error;

    const summaryRows = (summary.data ?? []) as Array<{
      movement_type: string;
      amount: number | string;
    }>;
    const incomeTotal = summaryRows
      .filter((row) => row.movement_type === 'ingreso')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const expenseTotal = summaryRows
      .filter((row) => row.movement_type === 'egreso')
      .reduce((sum, row) => sum + Number(row.amount), 0);

    return NextResponse.json({
      data: (movements.data ?? []).map((row) => mapMovement(row as CashMovementRow)),
      total: movements.count ?? 0,
      incomeTotal,
      expenseTotal,
    });
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
