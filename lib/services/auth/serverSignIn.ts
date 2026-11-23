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

    const data = await response.json();
    return { data, error: null };
  } catch {
    return { data: null, error: { message: 'Network error' } };
  }
}
