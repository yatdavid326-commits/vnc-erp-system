import { supabaseClient } from '@/lib/db/supabase';

// Server-side signin that bypasses RLS
export async function serverSignIn(username: string, password: string) {
  try {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { data: null, error: { message: data.error || 'Authentication failed' } };
    }

    const { user, session } = await response.json();
    return { data: { user, session }, error: null };
  } catch (error) {
    return { data: null, error: { message: 'Network error' } };
  }
}

// Client-side signin (for backwards compatibility)
export async function clientSignIn(emailOrUsername: string, password: string) {
  const result = await serverSignIn(emailOrUsername, password);
  if (!result.data?.session) {
    return result;
  }

  const { data, error } = await supabaseClient.auth.setSession(result.data.session);
  return error ? { data: null, error } : { data, error: null };
}
