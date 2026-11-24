'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Factor {
  id: string;
  friendlyName: string | null;
  status: string;
}

export default function SettingsPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFactors = async () => {
    const response = await fetch('/api/auth/mfa');
    if (!response.ok) {
      setError('No se pudieron cargar los factores MFA.');
      return;
    }
    const data = await response.json();
    setFactors(data.factors ?? []);
  };

  useEffect(() => {
    void loadFactors();
  }, []);

  const enroll = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    const response = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'No se pudo iniciar MFA.');
      setLoading(false);
      return;
    }
    setFactorId(data.factorId);
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setLoading(false);
  };

  const verifyEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId, code }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Código inválido.');
      setLoading(false);
      return;
    }
    setQrCode('');
    setSecret('');
    setCode('');
    setFactorId('');
    setMessage('Autenticación de dos factores configurada.');
    setLoading(false);
    await loadFactors();
  };

  const unlink = async (id: string) => {
    setLoading(true);
    setError('');
    setMessage('');
    const response = await fetch('/api/auth/mfa/unlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId: id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'No se pudo eliminar el factor.');
      setLoading(false);
      return;
    }
    setMessage('Factor MFA eliminado.');
    setLoading(false);
    await loadFactors();
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Configuración de seguridad</h1>
      {error && (
        <div role="alert" className="mt-4 flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="mt-4 flex gap-2 rounded border border-green-200 bg-green-50 p-3 text-green-700">
          <CheckCircle size={20} />
          {message}
        </div>
      )}
      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-semibold">Autenticación de dos factores</h2>
        {factors.length === 0 ? (
          <button type="button" onClick={enroll} disabled={loading} className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400">
            {loading ? <Loader2 className="animate-spin" /> : 'Configurar TOTP'}
          </button>
        ) : (
          <button type="button" onClick={() => unlink(factors[0].id)} disabled={loading} className="mt-4 rounded bg-red-600 px-4 py-2 text-white disabled:bg-gray-400">
            Eliminar factor
          </button>
        )}
        {qrCode && (
          <div className="mt-4 space-y-3">
            <img src={qrCode} alt="Código QR para configurar TOTP" className="h-48 w-48" />
            <p className="break-all text-sm">Clave manual: {secret}</p>
            <form onSubmit={verifyEnrollment} className="flex gap-2">
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" className="rounded border px-3 py-2" placeholder="123456" />
              <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">Verificar</button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
