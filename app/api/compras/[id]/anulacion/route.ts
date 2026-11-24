import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProfileId } from '@/lib/auth/getAuthenticatedProfileId';
import { comprasService } from '@/lib/services/compras/comprasService';
import { purchaseErrorResponse } from '../../errors';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Identificador no válido.' }, { status: 400 });
    const actor = await getAuthenticatedProfileId(request);
    return NextResponse.json(await comprasService.cancel(id, actor));
  } catch (error) {
    return purchaseErrorResponse(error, 'POST /api/compras/[id]/anulacion');
  }
}
