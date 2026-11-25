'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const tokenHash = searchParams.get('token_hash') ?? '';
  const recoveryToken = code || tokenHash;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          code
            ? { code, password }
            : { token_hash: tokenHash, password }
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo restablecer la contraseña.');
        return;
      }
      setMessage(data.message);
    } catch {
      setError('No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">Crear nueva contraseña</h1>
        {!recoveryToken && !error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            El enlace no contiene un código válido.
          </p>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
            Nueva contraseña
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              minLength={12}
              required
            />
          </label>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Confirmar contraseña
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              minLength={12}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading || !recoveryToken}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-gray-400"
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm font-medium text-blue-600 hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
