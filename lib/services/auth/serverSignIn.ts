import { supabase } from '@/lib/db/supabase';

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
      return { error: { message: data.error || 'Authentication failed' } };
    }

    const { user, session } = await response.json();
    return { data: { user, session }, error: null };
  } catch (error) {
    return { error: { message: 'Network error' } };
  }
}

// Client-side signin (for backwards compatibility)
export async function clientSignIn(emailOrUsername: string, password: string) {
  let email = emailOrUsername;

  // Check if input is a username (not an email)
  if (!emailOrUsername.includes('@')) {
    // Use server-side API to find the email by username
    try {
      const response = await fetch('/api/auth/login-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailOrUsername }),
      });

      if (!response.ok) {
        return { error: { message: 'Usuario no encontrado' } };
      }

      const { email: foundEmail } = await response.json();
      email = foundEmail;
    } catch (error) {
      return { error: { message: 'Error al buscar usuario' } };
    }
  }

  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}
