export const MAX_ATTENDANCE_QR_LENGTH = 200;

export type QrCodePayloadResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateQrCodePayload(value: string): QrCodePayloadResult {
  const normalized = value.trim();
  if (!normalized) {
    return { ok: false, error: 'El código QR no contiene datos.' };
  }
  if (normalized.length > MAX_ATTENDANCE_QR_LENGTH) {
    return {
      ok: false,
      error: `El código QR supera el máximo de ${MAX_ATTENDANCE_QR_LENGTH} caracteres.`,
    };
  }
  return { ok: true, value: normalized };
}
