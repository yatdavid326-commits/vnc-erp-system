export interface ReportEmailContent {
  tipo: string;
  periodo: string;
}

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class SendGridConfigurationError extends Error {
  constructor() {
    super('SendGrid report delivery is not fully configured.');
    this.name = 'SendGridConfigurationError';
  }
}

export class SendGridDeliveryError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(`SendGrid report delivery failed (${code}).`);
    this.name = 'SendGridDeliveryError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getSendGridConfig(
  env: Record<string, string | undefined> = process.env
): SendGridConfig {
  const apiKey = env.SENDGRID_API_KEY?.trim();
  const fromEmail = env.SENDGRID_FROM_EMAIL?.trim();
  const fromName = env.SENDGRID_FROM_NAME?.trim() || 'VNC Systems';

  if (
    !apiKey ||
    !fromEmail ||
    !isValidEmailAddress(fromEmail) ||
    fromName.length > 100 ||
    /[\r\n]/.test(fromName)
  ) {
    throw new SendGridConfigurationError();
  }

  return { apiKey, fromEmail, fromName };
}

export async function sendReportEmail(
  destination: string,
  report: ReportEmailContent,
  pdfContent: string,
  config: SendGridConfig,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  if (!isValidEmailAddress(destination)) {
    throw new SendGridDeliveryError('invalid_destination', false);
  }

  const safePeriod = report.periodo.replace(/[^0-9-]+/g, '-');
  const reportType = report.tipo.replace(/[^a-z]+/g, '');
  const subject = `Reporte ${reportType} (${report.periodo})`;

  const response = await fetchImpl('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: destination }] }],
      from: { email: config.fromEmail, name: config.fromName },
      subject,
      content: [
        {
          type: 'text/plain',
          value: `Adjuntamos el reporte de gestión para el período ${report.periodo}.`,
        },
      ],
      attachments: [
        {
          content: pdfContent,
          type: 'application/pdf',
          filename: `reporte-${reportType}-${safePeriod}.pdf`,
          disposition: 'attachment',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new SendGridDeliveryError(
      `http_${response.status}`,
      response.status === 429 || response.status >= 500
    );
  }
}
