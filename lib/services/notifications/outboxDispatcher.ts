import { supabaseAdmin } from '@/lib/db/supabase';
import {
  getTwilioConfig,
  sendLowStockMessage,
  TwilioDeliveryError,
  type ExternalNotificationChannel,
} from './twilioMessaging';
import {
  isEligibleNotificationRecipient,
  type NotificationRecipientProfile,
} from './recipientEligibility';

interface OutboxMessage {
  id: string;
  profile_id: string;
  channel: ExternalNotificationChannel;
  product_name: string;
  quantity_on_hand: number;
  reorder_level: number;
  attempts: number;
}

interface NotificationPreference {
  profile_id: string;
  phone_e164: string | null;
  sms_opt_in: boolean;
  whatsapp_opt_in: boolean;
}

function parseRecipientProfiles(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error('Notification profiles returned an invalid response.');
  }

  return value.map((item): NotificationRecipientProfile & { id: string } => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      (item.auth_id !== null && typeof item.auth_id !== 'string') ||
      (item.is_active !== null && typeof item.is_active !== 'boolean') ||
      (item.role !== null && typeof item.role !== 'string')
    ) {
      throw new Error('Notification profiles returned an invalid row.');
    }

    return {
      id: item.id,
      auth_id: item.auth_id,
      is_active: item.is_active,
      role: item.role,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseOutboxMessages(value: unknown): OutboxMessage[] {
  if (!Array.isArray(value)) {
    throw new Error('Notification outbox returned an invalid response.');
  }

  return value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.profile_id !== 'string' ||
      (item.channel !== 'sms' && item.channel !== 'whatsapp') ||
      typeof item.product_name !== 'string' ||
      typeof item.quantity_on_hand !== 'number' ||
      typeof item.reorder_level !== 'number' ||
      typeof item.attempts !== 'number' ||
      !Number.isSafeInteger(item.quantity_on_hand) ||
      item.quantity_on_hand < 0 ||
      !Number.isSafeInteger(item.reorder_level) ||
      item.reorder_level < 0 ||
      !Number.isSafeInteger(item.attempts) ||
      item.attempts < 1
    ) {
      throw new Error('Notification outbox returned an invalid message.');
    }

    return {
      id: item.id,
      profile_id: item.profile_id,
      channel: item.channel,
      product_name: item.product_name,
      quantity_on_hand: item.quantity_on_hand,
      reorder_level: item.reorder_level,
      attempts: item.attempts,
    };
  });
}

function parsePreferences(value: unknown): NotificationPreference[] {
  if (!Array.isArray(value)) {
    throw new Error('Notification preferences returned an invalid response.');
  }

  return value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.profile_id !== 'string' ||
      (item.phone_e164 !== null && typeof item.phone_e164 !== 'string') ||
      typeof item.sms_opt_in !== 'boolean' ||
      typeof item.whatsapp_opt_in !== 'boolean'
    ) {
      throw new Error('Notification preferences returned an invalid row.');
    }

    return {
      profile_id: item.profile_id,
      phone_e164: item.phone_e164,
      sms_opt_in: item.sms_opt_in,
      whatsapp_opt_in: item.whatsapp_opt_in,
    };
  });
}

export async function dispatchExternalNotifications(limit = 25) {
  const supabase = supabaseAdmin;
  if (!supabase) {
    throw new Error('Supabase admin client is not configured.');
  }

  const twilioConfig = getTwilioConfig();
  const { data, error } = await supabase.rpc(
    'claim_external_notification_outbox',
    { p_limit: limit }
  );
  if (error) throw error;

  const messages = parseOutboxMessages(data);
  if (messages.length === 0) {
    return { claimed: 0, sent: 0, skipped: 0, retried: 0, failed: 0 };
  }

  const releaseClaims = async (errorCode: string) => {
    for (const message of messages) {
      const { error: releaseError } = await supabase
        .from('external_notification_outbox')
        .update({
          status: 'pending',
          attempts: message.attempts - 1,
          locked_at: null,
          available_at: new Date(Date.now() + 60_000).toISOString(),
          last_error_code: errorCode,
        })
        .eq('id', message.id)
        .eq('status', 'sending');

      if (releaseError) {
        console.error('Unable to release a notification claim after lookup failure.');
        throw releaseError;
      }
    }
  };

  const profileIds = [...new Set(messages.map((message) => message.profile_id))];
  const { data: preferenceRows, error: preferenceError } = await supabase
    .from('user_notification_preferences')
    .select(
      'profile_id, phone_e164, sms_opt_in, whatsapp_opt_in'
    )
    .in('profile_id', profileIds);

  if (preferenceError) {
    await releaseClaims('preference_lookup_failed');
    throw preferenceError;
  }

  const { data: profileRows, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, auth_id, is_active, role')
    .in('id', profileIds);

  if (profileError) {
    await releaseClaims('profile_lookup_failed');
    throw profileError;
  }

  const profiles = parseRecipientProfiles(profileRows);
  const nonAdminProfileIds = profiles
    .filter((profile) => profile.role !== 'admin')
    .map((profile) => profile.id);
  let inventoryViewProfileIds = new Set<string>();

  if (nonAdminProfileIds.length > 0) {
    const { data: permissionRows, error: permissionError } = await supabase
      .from('user_modules')
      .select('user_id, can_view, module:modules!inner(name, is_active)')
      .in('user_id', nonAdminProfileIds)
      .eq('can_view', true)
      .eq('module.name', 'inventory')
      .eq('module.is_active', true);

    if (permissionError) {
      await releaseClaims('permission_lookup_failed');
      throw permissionError;
    }

    if (!Array.isArray(permissionRows)) {
      throw new Error('Inventory permissions returned an invalid response.');
    }

    inventoryViewProfileIds = new Set(
      permissionRows.map((permission) => permission.user_id)
    );
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const preferences = parsePreferences(preferenceRows);
  const preferenceByProfile = new Map(
    preferences.map((preference) => [preference.profile_id, preference])
  );
  const result = {
    claimed: messages.length,
    sent: 0,
    skipped: 0,
    retried: 0,
    failed: 0,
  };

  for (const message of messages) {
    const preference = preferenceByProfile.get(message.profile_id);
    const profile = profileById.get(message.profile_id);
    const isEligible = isEligibleNotificationRecipient(
      profile,
      inventoryViewProfileIds.has(message.profile_id)
    );
    const isOptedIn =
      message.channel === 'sms'
        ? preference?.sms_opt_in
        : preference?.whatsapp_opt_in;

    if (!preference || !isEligible || !isOptedIn || !preference.phone_e164) {
      const { error: updateError } = await supabase
        .from('external_notification_outbox')
        .update({
          status: 'skipped',
          locked_at: null,
          last_error_code: null,
        })
        .eq('id', message.id)
        .eq('status', 'sending');
      if (updateError) throw updateError;
      result.skipped += 1;
      continue;
    }

    let providerMessageId: string;
    try {
      providerMessageId = await sendLowStockMessage(
        message.channel,
        preference.phone_e164,
        {
          productName: message.product_name,
          quantityOnHand: message.quantity_on_hand,
          reorderLevel: message.reorder_level,
        },
        twilioConfig
      );
    } catch (error) {
      if (error instanceof TwilioDeliveryError) {
        const shouldRetry = error.retryable && message.attempts < 5;
        const delaySeconds = Math.min(
          60 * 2 ** Math.max(message.attempts - 1, 0),
          3600
        );
        const { error: updateError } = await supabase
          .from('external_notification_outbox')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            locked_at: null,
            available_at: new Date(
              Date.now() + delaySeconds * 1000
            ).toISOString(),
            last_error_code: error.code,
          })
          .eq('id', message.id)
          .eq('status', 'sending');
        if (updateError) throw updateError;
        if (shouldRetry) result.retried += 1;
        else result.failed += 1;
        console.error('Twilio notification attempt failed:', error.code);
        continue;
      }

      throw error;
    }

    const { error: updateError } = await supabase
      .from('external_notification_outbox')
      .update({
        status: 'sent',
        locked_at: null,
        sent_at: new Date().toISOString(),
        provider_message_id: providerMessageId,
        last_error_code: null,
      })
      .eq('id', message.id)
      .eq('status', 'sending');
    if (updateError) throw updateError;
    result.sent += 1;
  }

  return result;
}
