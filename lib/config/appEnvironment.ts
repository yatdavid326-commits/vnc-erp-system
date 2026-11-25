export type AppEnvironment = 'development' | 'staging' | 'production';

export function getAppEnvironment(
  value: string | undefined
): AppEnvironment {
  if (value === 'staging' || value === 'production') return value;
  return 'development';
}

export function getAppEnvironmentLabel(
  value: string | undefined
): string {
  switch (getAppEnvironment(value)) {
    case 'staging':
      return 'Mejoras y pruebas';
    case 'production':
      return 'Operaciones';
    default:
      return 'Desarrollo local';
  }
}
