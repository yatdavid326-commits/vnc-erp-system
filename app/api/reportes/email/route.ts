import { Buffer } from 'node:buffer';
import {
  AuthenticatedProfileError,
  getAuthenticatedProfileIdentity,
} from '@/lib/auth/getAuthenticatedProfileId';
import {
  getSendGridConfig,
  isValidEmailAddress,
  sendReportEmail,
  SendGridConfigurationError,
  SendGridDeliveryError,
} from '@/lib/services/email/sendgrid';
import { createReportPdf } from '@/lib/utils/reportPdf';
import { validateRequestBody } from '@/lib/validation/requestBody';
import { reportEmailSchema } from '@/lib/validation/requestSchemas';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const parsedBody = await validateRequestBody(request, reportEmailSchema);
  if (!parsedBody.success) return parsedBody.response;

  try {
    const identity = await getAuthenticatedProfileIdentity(request);
    if (!identity.email || !isValidEmailAddress(identity.email)) {
      return NextResponse.json(
        { error: 'La cuenta no tiene un correo válido para recibir el reporte.' },
        { status: 422 }
      );
    }

    const report = parsedBody.data.report;
    const pdf = createReportPdf([report]);
    const pdfContent = Buffer.from(pdf.output('arraybuffer')).toString('base64');
    await sendReportEmail(
      identity.email,
      report,
      pdfContent,
      getSendGridConfig()
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticatedProfileError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof SendGridConfigurationError) {
      console.error('SendGrid report delivery is not configured.');
      return NextResponse.json(
        { error: 'El envío de reportes por correo no está configurado.' },
        { status: 503 }
      );
    }
    if (error instanceof SendGridDeliveryError) {
      console.error('SendGrid report delivery failed:', error.code);
      return NextResponse.json(
        { error: 'No se pudo enviar el reporte por correo.' },
        {
          status:
            error.code === 'invalid_destination'
              ? 422
              : error.retryable
                ? 503
                : 502,
        }
      );
    }

    console.error('Report email API error:', error);
    return NextResponse.json(
      { error: 'No se pudo enviar el reporte por correo.' },
      { status: 500 }
    );
  }
}
