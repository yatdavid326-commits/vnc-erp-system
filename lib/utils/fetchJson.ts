export async function fetchJson<T>(
  url: string,
  errorMessage: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(errorMessage);
  return response.json();
}
