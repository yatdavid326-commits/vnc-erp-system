import { NextRequest, NextResponse } from 'next/server';
import {
  AuthenticatedProfileError,
  getAuthenticatedProfileIdentity,
} from '@/lib/auth/getAuthenticatedProfileId';
import { getDashboardSummary } from '@/lib/services/dashboard/dashboardService';

function errorResponse(error: unknown) {
  if (error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('Dashboard metrics API error:', error);
  return NextResponse.json(
    { error: 'No se pudieron cargar las métricas del panel.' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedProfileIdentity(request);
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
