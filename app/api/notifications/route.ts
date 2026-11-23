import { NextRequest, NextResponse } from 'next/server';
import {
  AuthenticatedProfileError,
  getAuthenticatedProfileIdentity,
} from '@/lib/auth/getAuthenticatedProfileId';
import { supabaseAdmin } from '@/lib/db/supabase';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { notificationReadSchema } from '@/lib/validation/requestSchemas';

const notificationFields = 'id, title, message, href, created_at, read_at';

function errorResponse(error: unknown) {
  if (error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('Notification API error:', error);
  return NextResponse.json(
    { error: 'No se pudieron cargar las notificaciones.' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { authId } = await getAuthenticatedProfileIdentity(request);
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const [notificationsResult, unreadCountResult] = await Promise.all([
      supabaseAdmin
        .from('notifications')
        .select(notificationFields)
        .eq('recipient_auth_id', authId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_auth_id', authId)
        .is('read_at', null),
    ]);

    if (notificationsResult.error) throw notificationsResult.error;
    if (unreadCountResult.error) throw unreadCountResult.error;

    return NextResponse.json({
      notifications: notificationsResult.data ?? [],
      unreadCount: unreadCountResult.count ?? 0,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const parsedBody = await validateRequestBody(request, notificationReadSchema);
  if (!parsedBody.success) return parsedBody.response;

  try {
    const { authId } = await getAuthenticatedProfileIdentity(request);
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const readAt = new Date().toISOString();
    const update = supabaseAdmin
      .from('notifications')
      .update({ read_at: readAt })
      .eq('recipient_auth_id', authId)
      .is('read_at', null);
    const { error } =
      'id' in parsedBody.data
        ? await update.eq('id', parsedBody.data.id)
        : await update;

    if (error) throw error;
    return NextResponse.json({ success: true, read_at: readAt });
  } catch (error) {
    return errorResponse(error);
  }
}
