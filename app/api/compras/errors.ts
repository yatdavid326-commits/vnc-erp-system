import { NextResponse } from 'next/server';
import { AuthenticatedProfileError } from '@/lib/auth/getAuthenticatedProfileId';
import { PurchaseError } from '@/lib/services/compras/comprasService';

export function purchaseErrorResponse(error: unknown, operation: string) {
  if (error instanceof PurchaseError || error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${operation} error:`, error);
  return NextResponse.json({ error: 'No se pudo completar la operación de compras. Revisa la orden antes de reintentar.' }, { status: 500 });
}
