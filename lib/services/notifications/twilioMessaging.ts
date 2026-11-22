import { Buffer } from 'node:buffer';

export type ExternalNotificationChannel = 'sms' | 'whatsapp';

export interface LowStockAlert {
  productName: string;
  quantityOnHand: number;
  reorderLevel: number;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
  whatsappContentSid: string;
}

export class TwilioConfigurationError extends Error {
  constructor() {
    super('Twilio notification delivery is not fully configured.');
    this.name = 'TwilioConfigurationError';
  }
}

export class TwilioDeliveryError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(
    code: string,
    retryable: boolean
  ) {
    super(`Twilio message delivery failed (${code}).`);
    this.name = 'TwilioDeliveryError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function getTwilioConfig(
  env: Record<string, string | undefined> = process.env
): TwilioConfig {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
  const whatsappContentSid = env.TWILIO_WHATSAPP_CONTENT_SID;

  if (
    !accountSid ||
    !authToken ||
    !messagingServiceSid ||
    !whatsappContentSid
  ) {
    throw new TwilioConfigurationError();
  }

  return {
    accountSid,
    authToken,
    messagingServiceSid,
    whatsappContentSid,
  };
}

function normalizeProductName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 120);
}

export function formatLowStockSms(alert: LowStockAlert) {
  const productName = normalizeProductName(alert.productName);
  return `Inventario bajo: ${productName} tiene ${alert.quantityOnHand} unidades (mínimo ${alert.reorderLevel}). Responde STOP para cancelar.`;
}

export async function sendLowStockMessage(
  channel: ExternalNotificationChannel,
  destination: string,
  alert: LowStockAlert,
  config: TwilioConfig,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  if (!/^\+[1-9]\d{7,14}$/.test(destination)) {
    throw new TwilioDeliveryError('invalid_destination', false);
  }
  if (
    !Number.isSafeInteger(alert.quantityOnHand) ||
    alert.quantityOnHand < 0 ||
    !Number.isSafeInteger(alert.reorderLevel) ||
    alert.reorderLevel < 0
  ) {
    throw new TwilioDeliveryError('invalid_alert', false);
  }

  const form = new URLSearchParams({
    To: channel === 'whatsapp' ? `whatsapp:${destination}` : destination,
    MessagingServiceSid: config.messagingServiceSid,
  });

  if (channel === 'whatsapp') {
    form.set('ContentSid', config.whatsappContentSid);
    form.set(
      'ContentVariables',
      JSON.stringify({
        '1': normalizeProductName(alert.productName),
        '2': String(alert.quantityOnHand),
        '3': String(alert.reorderLevel),
      })
    );
  } else {
    form.set('Body', formatLowStockSms(alert));
  }

  const response = await fetchImpl(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.accountSid}:${config.authToken}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    throw new TwilioDeliveryError(
      `http_${response.status}`,
      response.status === 429 || response.status >= 500
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await response.text());
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TwilioDeliveryError('invalid_response', true);
    }
    throw error;
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('sid' in payload) ||
    typeof payload.sid !== 'string' ||
    payload.sid.length === 0
  ) {
    throw new TwilioDeliveryError('invalid_response', true);
  }

  return payload.sid;
}
