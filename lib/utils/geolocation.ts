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
