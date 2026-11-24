'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { serverSignIn } from '@/lib/services/auth/serverSignIn';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use server-side signin that bypasses RLS
      const { data, error } = await serverSignIn(username, password);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data?.mfaRequired) {
        const factorsResponse = await fetch('/api/auth/mfa');
        if (!factorsResponse.ok) {
          setError('No se pudo iniciar la verificación adicional.');
          setLoading(false);
          return;
        }
        const factors = await factorsResponse.json();
        const verifiedFactor = factors.factors?.find(
          (factor: { status: string }) => factor.status === 'verified'
        );
        if (!verifiedFactor) {
          setError('No se encontró un factor MFA activo.');
          setLoading(false);
          return;
        }
        setFactorId(verifiedFactor.id);
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      router.replace('/dashboard');
    } catch (err) {
      setError('Error al iniciar sesión. Intenta nuevamente.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleMfaVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code: mfaCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Código MFA inválido.');
        setLoading(false);
        return;
      }
      router.replace('/dashboard');
    } catch {
      setError('No se pudo verificar el código MFA.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              V
            </div>
            <h1 className="text-3xl font-bold text-gray-900">VNC Systems</h1>
            <p className="text-gray-600 mt-2">Sistema de Gestión Empresarial</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2"
            >
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          {mfaRequired ? (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Código de autenticador
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="123456"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Verificar código
              </button>
            </form>
          ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="tu_usuario"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
          )}

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

