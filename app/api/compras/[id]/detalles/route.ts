import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProfileId } from '@/lib/auth/getAuthenticatedProfileId';
import { purchaseDetailsSchema } from '@/lib/purchases';
import { comprasService } from '@/lib/services/compras/comprasService';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { purchaseErrorResponse } from '../../errors';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Identificador no válido.' }, { status: 400 });
    const input = await validateRequestBody(request, purchaseDetailsSchema);
    if (!input.success) return input.response;
    const actor = await getAuthenticatedProfileId(request);
    return NextResponse.json(await comprasService.editDetails(id, input.data, actor));
  } catch (error) {
    return purchaseErrorResponse(error, 'PATCH /api/compras/[id]/detalles');
  }
}
