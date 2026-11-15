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
