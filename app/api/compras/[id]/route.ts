import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { comprasService } from '@/lib/services/compras/comprasService';
import { purchaseErrorResponse } from '../errors';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Identificador de compra no válido.' }, { status: 400 });
    }
    const data = await comprasService.getById(id);
    if (!data) return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return purchaseErrorResponse(error, 'GET /api/compras/[id]');
  }
}
