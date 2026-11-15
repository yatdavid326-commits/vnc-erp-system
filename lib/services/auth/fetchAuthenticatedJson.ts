import { supabase } from '@/lib/db/supabase';

export async function fetchAuthenticatedJson(path: string): Promise<unknown> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  const result: unknown = await response.json();
  const payload = result !== null && typeof result === 'object' ? result as Record<string, unknown> : null;
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' && payload.error ? payload.error : 'No se pudo consultar el resumen.');
  }
  return result;
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const result: unknown = await response.json();
    const payload = result !== null && typeof result === 'object' ? result as Record<string, unknown> : null;
    throw new Error(typeof payload?.error === 'string' && payload.error ? payload.error : 'No se pudo descargar el informe.');
  }
  if (response.headers.get('content-type')?.split(';', 1)[0].trim() !== 'text/csv') {
    throw new Error('El archivo del informe recibido no es válido.');
  }
  return response.blob();
}
