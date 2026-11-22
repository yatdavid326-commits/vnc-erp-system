async function throwResponseError(response: Response, errorMessage: string) {
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const payload: unknown = await response.json();
        if (
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
        ) {
          throw new Error(payload.error);
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
    throw new Error(errorMessage);
  }
}

export async function fetchJson<T>(
  url: string,
  errorMessage: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
  await throwResponseError(response, errorMessage);
  return response.json();
}

export async function fetchPaginatedJson<T>(
  url: string,
  errorMessage: string,
  init?: RequestInit
): Promise<{ data: T[]; total: number }> {
  const response = await fetch(url, init);
  await throwResponseError(response, errorMessage);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('La respuesta de paginación no contiene una lista.');
  }

  const totalHeader = response.headers.get('X-Total-Count');
  if (totalHeader === null) {
    throw new Error('La respuesta de paginación no incluye el total de registros.');
  }
  const total = Number(totalHeader);
  if (!Number.isSafeInteger(total) || total < payload.length) {
    throw new Error('La respuesta de paginación contiene un total no válido.');
  }

  return { data: payload as T[], total };
}
