import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSendGridConfig,
  isValidEmailAddress,
  sendReportEmail,
  SendGridConfigurationError,
  SendGridDeliveryError,
} from '../lib/services/email/sendgrid.ts';

const config = {
  apiKey: 'SG.test-key',
  fromEmail: 'reports@example.com',
  fromName: 'VNC Reports',
};
const report = {
  tipo: 'resumen',
  periodo: '2026-11-01 a 2026-11-22',
};
const pdfContent = Buffer.from('%PDF-1.4 test document').toString('base64');

test('SendGrid configuration requires a valid sender and keeps the API key server-side', () => {
  assert.throws(() => getSendGridConfig({}), SendGridConfigurationError);
  assert.deepEqual(
    getSendGridConfig({
      SENDGRID_API_KEY: config.apiKey,
      SENDGRID_FROM_EMAIL: config.fromEmail,
      SENDGRID_FROM_NAME: config.fromName,
    }),
    config
  );
  assert.throws(
    () =>
      getSendGridConfig({
        SENDGRID_API_KEY: config.apiKey,
        SENDGRID_FROM_EMAIL: 'not-an-email',
      }),
    SendGridConfigurationError
  );
  assert.throws(
      () =>
        getSendGridConfig({
          SENDGRID_API_KEY: config.apiKey,
          SENDGRID_FROM_EMAIL: config.fromEmail,
          SENDGRID_FROM_NAME: 'VNC\r\nBcc: other@example.com',
        }),
      SendGridConfigurationError
  );
  assert.equal(isValidEmailAddress('recipient@example.com'), true);
  assert.equal(isValidEmailAddress('invalid-address'), false);
});

test('report email sends a PDF only to the provided authenticated destination', async () => {
  let request;
  await sendReportEmail(
    'user@example.com',
    report,
    pdfContent,
    config,
    async (url, options) => {
      request = { url, options };
      return new Response(null, { status: 202 });
    }
  );

  assert.equal(request.url, 'https://api.sendgrid.com/v3/mail/send');
  assert.equal(request.options.method, 'POST');
  assert.equal(
    request.options.headers.Authorization,
    `Bearer ${config.apiKey}`
  );
  const payload = JSON.parse(request.options.body);
  assert.deepEqual(payload.personalizations, [
    { to: [{ email: 'user@example.com' }] },
  ]);
  assert.deepEqual(payload.from, {
    email: config.fromEmail,
    name: config.fromName,
  });
  assert.equal(payload.subject, 'Reporte resumen (2026-11-01 a 2026-11-22)');
  assert.equal(payload.attachments[0].content, pdfContent);
  assert.equal(payload.attachments[0].type, 'application/pdf');
  assert.equal(
    Buffer.from(payload.attachments[0].content, 'base64')
      .subarray(0, 4)
      .toString(),
    '%PDF'
  );
});

test('invalid recipients and provider failures are surfaced safely', async () => {
  await assert.rejects(
    sendReportEmail('invalid-address', report, pdfContent, config, async () => {
      throw new Error('fetch should not be called');
    }),
    (error) => {
      assert.equal(error.code, 'invalid_destination');
      assert.equal(error.retryable, false);
      return true;
    }
  );

  await assert.rejects(
    sendReportEmail(
      'user@example.com',
      report,
      pdfContent,
      config,
      async () => new Response('provider detail', { status: 429 })
    ),
    (error) => {
      assert.ok(error instanceof SendGridDeliveryError);
      assert.equal(error.code, 'http_429');
      assert.equal(error.retryable, true);
      assert.equal(error.message.includes('provider detail'), false);
      return true;
    }
  );

  await assert.rejects(
    sendReportEmail(
      'user@example.com',
      report,
      pdfContent,
      config,
      async () => new Response('provider detail', { status: 400 })
    ),
    (error) => {
      assert.equal(error.code, 'http_400');
      assert.equal(error.retryable, false);
      return true;
    }
  );
});
