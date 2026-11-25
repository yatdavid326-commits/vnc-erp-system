'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(
        response.ok
          ? data.message
          : data.error || 'No se pudo enviar el enlace de recuperación.'
      );
    } catch {
      setMessage('No se pudo enviar el enlace de recuperación.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-gray-600">
          Ingresa tu correo para recibir un enlace de recuperación.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
              required
              maxLength={254}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-gray-400"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
        {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
        <Link href="/login" className="mt-6 block text-center text-sm font-medium text-blue-600 hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
