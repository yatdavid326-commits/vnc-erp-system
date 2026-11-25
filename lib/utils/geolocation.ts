export function getGeolocationErrorMessage(code: number, message: string): string {
  switch (code) {
    case 1:
      return 'Permite el acceso a la ubicación en tu navegador para obtener las coordenadas.';
    case 2:
      return 'El dispositivo no pudo determinar la ubicación. Verifica la señal GPS e inténtalo de nuevo.';
    case 3:
      return 'La solicitud de ubicación tardó demasiado. Inténtalo de nuevo.';
    default:
      return message || 'No se pudo obtener la ubicación del dispositivo.';
  }
}

export const MAX_ATTENDANCE_LOCATION_AGE_MS = 2 * 60 * 1000;
export const MAX_ATTENDANCE_LOCATION_ACCURACY_METERS = 250;

export function validateAttendanceLocation(
  latitude: number,
  longitude: number,
  accuracy: number,
  timestamp: number,
  now = Date.now()
): { ok: true } | { ok: false; error: string } {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy) ||
    !Number.isFinite(timestamp) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { ok: false, error: 'Las coordenadas GPS no son válidas.' };
  }
  if (accuracy < 0 || accuracy > MAX_ATTENDANCE_LOCATION_ACCURACY_METERS) {
    return {
      ok: false,
      error: 'La ubicación no es suficientemente precisa. Intenta actualizarla en exteriores.',
    };
  }
  if (timestamp <= 0 || timestamp > now || now - timestamp > MAX_ATTENDANCE_LOCATION_AGE_MS) {
    return {
      ok: false,
      error: 'La ubicación GPS está desactualizada. Obtén una ubicación nueva.',
    };
  }
  return { ok: true };
}
