import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatLowStockSms,
  getTwilioConfig,
  sendLowStockMessage,
  TwilioConfigurationError,
  TwilioDeliveryError,
} from '../lib/services/notifications/twilioMessaging.ts';

const config = {
  accountSid: 'AC' + 'a'.repeat(32),
  authToken: 'test-secret',
  messagingServiceSid: 'MG' + 'b'.repeat(32),
  whatsappContentSid: 'HX' + 'c'.repeat(32),
};
const alert = {
  productName: 'Producto A',
  quantityOnHand: 3,
  reorderLevel: 5,
};

test('Twilio configuration requires the account, service, and approved WhatsApp template', () => {
  assert.throws(() => getTwilioConfig({}), TwilioConfigurationError);
  assert.deepEqual(
    getTwilioConfig({
      TWILIO_ACCOUNT_SID: config.accountSid,
      TWILIO_AUTH_TOKEN: config.authToken,
      TWILIO_MESSAGING_SERVICE_SID: config.messagingServiceSid,
      TWILIO_WHATSAPP_CONTENT_SID: config.whatsappContentSid,
    }),
    config
  );
});

test('SMS delivery uses the configured service and a short opt-out message', async () => {
  let request;
  const sid = await sendLowStockMessage(
    'sms',
    '+50255550123',
    alert,
    config,
    async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ sid: 'SM' + 'd'.repeat(32) }), {
        status: 201,
      });
    }
  );

  assert.equal(sid, 'SM' + 'd'.repeat(32));
  assert.match(request.url, /\/Accounts\/AC[a]{32}\/Messages\.json$/);
  assert.equal(request.options.method, 'POST');
  assert.equal(
    Buffer.from(
      request.options.headers.Authorization.slice('Basic '.length),
      'base64'
    ).toString(),
    `${config.accountSid}:${config.authToken}`
  );

  const body = new URLSearchParams(request.options.body);
  assert.equal(body.get('To'), '+50255550123');
  assert.equal(body.get('MessagingServiceSid'), config.messagingServiceSid);
  assert.equal(
    body.get('Body'),
    'Inventario bajo: Producto A tiene 3 unidades (mínimo 5). Responde STOP para cancelar.'
  );
  assert.equal(formatLowStockSms({ ...alert, productName: 'Producto\nA' }).includes('\n'), false);
});

test('WhatsApp delivery uses an approved content template and variables', async () => {
  let requestBody;
  await sendLowStockMessage(
    'whatsapp',
    '+50255550123',
    alert,
    config,
    async (_url, options) => {
      requestBody = new URLSearchParams(options.body);
      return new Response(JSON.stringify({ sid: 'SM' + 'e'.repeat(32) }), {
        status: 201,
      });
    }
  );

  assert.equal(requestBody.get('To'), 'whatsapp:+50255550123');
  assert.equal(
    requestBody.get('MessagingServiceSid'),
    config.messagingServiceSid
  );
  assert.equal(requestBody.get('ContentSid'), config.whatsappContentSid);
  assert.deepEqual(JSON.parse(requestBody.get('ContentVariables')), {
    '1': 'Producto A',
    '2': '3',
    '3': '5',
  });
  assert.equal(requestBody.has('Body'), false);
});

test('delivery failures expose a safe code and retry only transient responses', async () => {
  await assert.rejects(
    sendLowStockMessage(
      'sms',
      '+50255550123',
      alert,
      config,
      async () => new Response('private provider response', { status: 503 })
    ),
    (error) => {
      assert.ok(error instanceof TwilioDeliveryError);
      assert.equal(error.code, 'http_503');
      assert.equal(error.retryable, true);
      assert.equal(error.message.includes('private provider response'), false);
      return true;
    }
  );

  await assert.rejects(
    sendLowStockMessage(
      'sms',
      '+50255550123',
      alert,
      config,
      async () => new Response('rejected', { status: 400 })
    ),
    (error) => {
      assert.ok(error instanceof TwilioDeliveryError);
      assert.equal(error.code, 'http_400');
      assert.equal(error.retryable, false);
      return true;
    }
  );

  await assert.rejects(
    sendLowStockMessage(
      'sms',
      '+50255550123',
      alert,
      config,
      async () => new Response('rate limited', { status: 429 })
    ),
    (error) => {
      assert.equal(error.code, 'http_429');
      assert.equal(error.retryable, true);
      return true;
    }
  );
});

test('invalid destinations, alert values, and provider responses are rejected', async () => {
  await assert.rejects(
    sendLowStockMessage('sms', '555-0123', alert, config, async () => {
      throw new Error('fetch should not be called');
    }),
    (error) => {
      assert.equal(error.code, 'invalid_destination');
      assert.equal(error.retryable, false);
      return true;
    }
  );

  await assert.rejects(
    sendLowStockMessage(
      'sms',
      '+50255550123',
      { ...alert, quantityOnHand: -1 },
      config,
      async () => {
        throw new Error('fetch should not be called');
      }
    ),
    (error) => {
      assert.equal(error.code, 'invalid_alert');
      assert.equal(error.retryable, false);
      return true;
    }
  );

  await assert.rejects(
    sendLowStockMessage(
      'sms',
      '+50255550123',
      alert,
      config,
      async () => new Response('not json', { status: 201 })
    ),
    (error) => {
      assert.equal(error.code, 'invalid_response');
      assert.equal(error.retryable, true);
      return true;
    }
  );

  await assert.rejects(
    sendLowStockMessage(
      'sms',
      '+50255550123',
      alert,
      config,
      async () => new Response(JSON.stringify({}), { status: 201 })
    ),
    (error) => {
      assert.equal(error.code, 'invalid_response');
      assert.equal(error.retryable, true);
      return true;
    }
  );

  const networkError = new Error('network unavailable');
  await assert.rejects(
    sendLowStockMessage(
      'sms',
      '+50255550123',
      alert,
      config,
      async () => ({
        ok: true,
        text: async () => {
          throw networkError;
        },
      })
    ),
    networkError
  );
});
