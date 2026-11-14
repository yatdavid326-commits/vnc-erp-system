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

      // Save session and tokens to localStorage for persistence
      if (data?.session) {
        localStorage.setItem('supabase-session', JSON.stringify(data.session));
        localStorage.setItem('supabase-access-token', data.accessToken || data.session.access_token);
        localStorage.setItem('supabase-refresh-token', data.refreshToken || data.session.refresh_token);
        localStorage.setItem('supabase-user', JSON.stringify(data.user));
      }

      // Small delay to ensure localStorage is set
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (err) {
      setError('Error al iniciar sesión. Intenta nuevamente.');
      console.error(err);
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
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

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>

        {/* Demo Info */}
        <div className="mt-6 text-center text-white text-sm">
          <p>📌 Demo: usuario <strong>admin</strong> | contraseña <strong>Admin@12345678</strong></p>
        </div>
      </div>
    </div>
  );
}

