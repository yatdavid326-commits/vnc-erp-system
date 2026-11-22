import {
  AuthenticatedProfileError,
  getAuthenticatedProfileId,
} from '@/lib/auth/getAuthenticatedProfileId';
import { supabaseAdmin } from '@/lib/db/supabase';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { notificationPreferencesSchema } from '@/lib/validation/requestSchemas';
import { NextRequest, NextResponse } from 'next/server';

const preferenceFields =
  'phone_e164, sms_opt_in, sms_consented_at, whatsapp_opt_in, whatsapp_consented_at';

const defaultPreferences = {
  phone_e164: null,
  sms_opt_in: false,
  sms_consented_at: null,
  whatsapp_opt_in: false,
  whatsapp_consented_at: null,
};

function profileErrorResponse(error: unknown) {
  if (error instanceof AuthenticatedProfileError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('Notification preference API error:', error);
  return NextResponse.json(
    { error: 'No se pudieron guardar las preferencias de notificación.' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await getAuthenticatedProfileId(request);
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('user_notification_preferences')
      .select(preferenceFields)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data ?? defaultPreferences);
  } catch (error) {
    return profileErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const parsedBody = await validateRequestBody(
    request,
    notificationPreferencesSchema
  );
  if (!parsedBody.success) return parsedBody.response;

  try {
    const profileId = await getAuthenticatedProfileId(request);
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const preferences = parsedBody.data;
    const consentedAt = new Date().toISOString();
    const hasOptIn = preferences.sms_opt_in || preferences.whatsapp_opt_in;
    const { data, error } = await supabaseAdmin
      .from('user_notification_preferences')
      .upsert(
        {
          profile_id: profileId,
          phone_e164: hasOptIn ? preferences.phone_e164 : null,
          sms_opt_in: preferences.sms_opt_in,
          sms_consented_at: preferences.sms_opt_in ? consentedAt : null,
          whatsapp_opt_in: preferences.whatsapp_opt_in,
          whatsapp_consented_at: preferences.whatsapp_opt_in
            ? consentedAt
            : null,
          updated_at: consentedAt,
        },
        { onConflict: 'profile_id' }
      )
      .select(preferenceFields)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return profileErrorResponse(error);
  }
}
