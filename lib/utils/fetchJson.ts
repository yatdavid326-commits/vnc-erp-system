export async function fetchJson<T>(
  url: string,
  errorMessage: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
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
  return response.json();
}
