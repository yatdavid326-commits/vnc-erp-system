export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = DEFAULT_PAGE_SIZE
): { page: number; limit: number } | { error: string } {
  const rawPage = searchParams.get('page');
  const rawLimit = searchParams.get('limit');
  if (
    (rawPage !== null && !/^\d+$/.test(rawPage)) ||
    (rawLimit !== null && !/^\d+$/.test(rawLimit))
  ) {
    return { error: 'La página y el límite deben ser enteros.' };
  }

  const page = Number(rawPage ?? 1);
  const limit = Number(rawLimit ?? defaultLimit);

  if (!Number.isSafeInteger(page) || page < 1) {
    return { error: 'El número de página debe ser un entero positivo.' };
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    return { error: `El límite debe ser un entero entre 1 y ${MAX_PAGE_SIZE}.` };
  }
  if (!Number.isSafeInteger((page - 1) * limit)) {
    return { error: 'El desplazamiento de página excede el límite permitido.' };
  }

  return { page, limit };
}
