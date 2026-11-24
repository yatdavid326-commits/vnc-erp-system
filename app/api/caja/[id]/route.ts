import { AuthenticatedProfileError, getAuthenticatedProfileId } from '@/lib/auth/getAuthenticatedProfileId';
import { supabaseAdmin } from '@/lib/db/supabase';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { cashMovementUpdateSchema } from '@/lib/validation/requestSchemas';
import { NextRequest, NextResponse } from 'next/server';

async function mutateMovement(request: NextRequest, id: string, changes: object | null) {
  try {
    const actor = await getAuthenticatedProfileId(request);
    if (!supabaseAdmin) throw new Error('Admin client not available');
    const { data, error } = await supabaseAdmin.rpc('mutate_manual_cash_movement', {
      p_id: id,
      p_actor: actor,
      p_changes: changes,
    });
    if (error?.message === 'NO_OPEN_REGISTER') {
      return NextResponse.json({ error: 'Abre una caja antes de modificar movimientos.' }, { status: 409 });
    }
    if (error?.code === '22P02') {
      return NextResponse.json({ error: 'Identificador de movimiento no válido.' }, { status: 400 });
    }
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Movimiento manual no encontrado en tu caja.' }, { status: 404 });
    return NextResponse.json(changes === null ? { success: true } : data);
  } catch (error) {
    if (error instanceof AuthenticatedProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Cash movement mutation error:', error);
    return NextResponse.json({ error: 'No se pudo modificar el movimiento de caja.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await validateRequestBody(request, cashMovementUpdateSchema);
  if (!parsed.success) return parsed.response;
  return mutateMovement(request, (await params).id, parsed.data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return mutateMovement(request, (await params).id, null);
}
