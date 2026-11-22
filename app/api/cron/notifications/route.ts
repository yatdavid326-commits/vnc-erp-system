import { hasValidCronAuthorization } from '@/lib/auth/cronAuthorization';
import { dispatchExternalNotifications } from '@/lib/services/notifications/outboxDispatcher';
import { TwilioConfigurationError } from '@/lib/services/notifications/twilioMessaging';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured.');
    return NextResponse.json(
      { error: 'Notification scheduler is not configured.' },
      { status: 500 }
    );
  }

  if (
    !hasValidCronAuthorization(
      request.headers.get('authorization'),
      cronSecret
    )
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await dispatchExternalNotifications();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TwilioConfigurationError) {
      console.error('Twilio notification delivery is not configured.');
      return NextResponse.json(
        { error: 'Notification delivery is not configured.' },
        { status: 503 }
      );
    }

    console.error('Notification scheduler failed:', error);
    return NextResponse.json(
      { error: 'Could not process external notifications.' },
      { status: 500 }
    );
  }
}
