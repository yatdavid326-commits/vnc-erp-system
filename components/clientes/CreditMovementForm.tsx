'use client';

import { useState } from 'react';
import { creditTransactionSchema } from '@/lib/validation/requestSchemas';
import type { z } from 'zod';

type Movement = z.infer<typeof creditTransactionSchema>;

export default function CreditMovementForm({ clienteId, onSaved }: {
  clienteId: string;
  onSaved: () => Promise<void>;
}) {
  const storageKey = `credit-movement:${clienteId}`;
  const [stored] = useState(() => {
    try {
      const value = sessionStorage.getItem(storageKey);
      if (!value) return { movement: null, error: '' };
      const result = creditTransactionSchema.safeParse(JSON.parse(value));
      return result.success
        ? { movement: result.data, error: '' }
        : { movement: null, error: 'No se pudo recuperar el movimiento pendiente. No registre otro hasta revisar el historial.' };
    } catch {
      return { movement: null, error: 'No se pudo acceder al movimiento pendiente. No registre otro hasta revisar el historial.' };
    }
  });
  const [pending, setPending] = useState<Movement | null>(stored.movement);
  const [tipo, setTipo] = useState<'compra' | 'pago' | 'ajuste'>('pago');
  const [direction, setDirection] = useState<'aumento' | 'reduccion'>('aumento');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState(stored.error);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || stored.error) return;
    const movement = pending ?? {
      id: crypto.randomUUID(),
      tipo,
      monto: Number(monto) * (tipo === 'ajuste' && direction === 'reduccion' ? -1 : 1),
      descripcion: descripcion.trim(),
      fecha: new Date().toISOString(),
    };
    if (!creditTransactionSchema.safeParse(movement).success) {
      setError('Ingrese un monto válido mayor que cero y con hasta dos decimales.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(movement));
      setPending(movement);
      const response = await fetch(`/api/clientes/${clienteId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movement),
      });
      if (!response.ok) {
        const payload: unknown = await response.json();
        const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error : 'No se pudo registrar el movimiento.';
        if (response.status === 400 || response.status === 404 || response.status === 409) {
          sessionStorage.removeItem(storageKey);
          setPending(null);
        }
        throw new Error(message);
      }
      sessionStorage.removeItem(storageKey);
      setPending(null);
      setMonto('');
      setDescripcion('');
      try {
        await onSaved();
      } catch {
        setError('El movimiento se guardó, pero no se pudo actualizar la información. Cierre y vuelva a abrir el cliente.');
      }
    } catch (failure) {
      setError(failure instanceof TypeError
        ? 'No se pudo confirmar el envío. Reintente el mismo movimiento.'
        : failure instanceof Error ? failure.message : 'No se pudo registrar el movimiento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-t pt-6 space-y-3">
      <h3 className="text-lg font-semibold">Registrar movimiento de crédito</h3>
      {pending && <p className="text-amber-700">Hay un envío pendiente. Reintente el mismo movimiento antes de registrar otro.</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <fieldset disabled={busy || !!pending || !!stored.error} className="grid gap-3 md:grid-cols-2">
        <label>Tipo
          <select value={tipo} onChange={(event) => setTipo(event.target.value as typeof tipo)} className="block w-full border rounded p-2">
            <option value="pago">Pago</option>
            <option value="compra">Compra</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </label>
        {tipo === 'ajuste' && <label>Sentido
          <select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)} className="block w-full border rounded p-2">
            <option value="aumento">Aumentar deuda</option>
            <option value="reduccion">Reducir deuda</option>
          </select>
        </label>}
        <label>Monto
          <input required type="number" min="0.01" step="0.01" value={monto} onChange={(event) => setMonto(event.target.value)} className="block w-full border rounded p-2" />
        </label>
        <label>Descripción
          <input maxLength={1000} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} className="block w-full border rounded p-2" />
        </label>
      </fieldset>
      <button disabled={busy || !!stored.error} type="submit" className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
        {busy ? 'Guardando...' : pending ? 'Reintentar movimiento' : 'Registrar movimiento'}
      </button>
    </form>
  );
}
