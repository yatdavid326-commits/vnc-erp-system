import { getAuthenticatedProfileId, AuthenticatedProfileError } from '@/lib/auth/getAuthenticatedProfileId';
import { supabaseAdmin } from '@/lib/db/supabase';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { inventoryMovementSchema } from '@/lib/validation/requestSchemas';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

const errorMessages: Record<string, string> = {
  product_missing: 'Producto no encontrado.',
  product_inactive: 'No se pueden registrar movimientos para un producto inactivo.',
  stock_uninitialized: 'Registra primero un ajuste con la cantidad contada.',
  invalid_stock: 'Las existencias actuales son inconsistentes y requieren revisión.',
  insufficient_stock: 'La cantidad no puede ser menor que las unidades reservadas.',
  stock_overflow: 'La cantidad supera el máximo permitido.',
  movement_conflict: 'La solicitud ya se utilizó con otros datos. Revisa el historial antes de continuar.',
  invalid_movement: 'Revisa los datos del movimiento.',
};

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  }

  const parsedBody = await validateRequestBody(request, inventoryMovementSchema);
  if (!parsedBody.success) return parsedBody.response;

  try {
    const actorId = await getAuthenticatedProfileId(request);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin.rpc('record_manual_inventory_movement', {
      p_id: parsedBody.data.id,
      p_product_id: id,
      p_actor_id: actorId,
      p_type: parsedBody.data.type,
      p_quantity: parsedBody.data.quantity,
      p_notes: parsedBody.data.notes,
    });

    if (error) {
      if (error.code === 'P0001' && errorMessages[error.message]) {
        return NextResponse.json(
          { error: errorMessages[error.message] },
          { status: error.message === 'product_missing' ? 404 : 409 }
        );
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: errorMessages.movement_conflict }, { status: 409 });
      }
      console.error('Manual inventory movement failed:', error);
      return NextResponse.json({ error: 'No se pudo registrar el movimiento.' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthenticatedProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/inventario/[id]/movimientos error:', error);
    return NextResponse.json({ error: 'No se pudo registrar el movimiento.' }, { status: 500 });
  }
}
