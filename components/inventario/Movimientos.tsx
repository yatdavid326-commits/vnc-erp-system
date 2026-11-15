'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/db/supabase';
import type { Product } from '@/lib/products';
import type { InventoryMovement, MovementInput } from '@/lib/inventoryMovement';

async function request(path: string, method = 'GET', body?: MovementInput) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Error al consultar movimientos (${response.status}).`);
  return result;
}

const names: Record<string, string> = { entry: 'Entrada', exit: 'Salida', adjustment: 'Ajuste (cantidad final)' };

export default function Movimientos({ product, canEdit, onClose, onUpdated }: {
  product: Product; canEdit: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const [history, setHistory] = useState<InventoryMovement[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [type, setType] = useState<MovementInput['type']>(product.inventory ? 'entry' : 'adjustment');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let active = true;
    request(`/api/inventario/${product.id}/movimientos?page=${page}`).then((result) => {
      if (active) { setHistory(result.data); setCount(result.count); }
    }).catch((err) => {
      if (active) {
        setHistory([]);
        setError(err instanceof Error ? err.message : 'No se pudo consultar el historial.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product.id, page, revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await request(`/api/inventario/${product.id}/movimientos`, 'POST', {
        id: requestId, type, quantity: Number(quantity), notes,
      });
      setRequestId(crypto.randomUUID());
      setQuantity(''); setNotes('');
      setNotice('Movimiento registrado.');
      setLoading(true); setPage(1); setRevision((value) => value + 1);
      onUpdated();
    } catch (err) {
      setError(err instanceof TypeError ? 'No se pudo confirmar el movimiento. Revisa el historial antes de reintentar.' :
        err instanceof Error ? err.message : 'No se pudo confirmar el movimiento. Revisa el historial antes de reintentar.');
    } finally { setSaving(false); }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2';
  return (
    <section className="space-y-4 rounded bg-white p-5 shadow-sm" aria-label={`Movimientos de ${product.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Movimientos: {product.name}</h2>
        <button type="button" disabled={saving} className="rounded border px-3 py-1" onClick={onClose}>Cerrar</button>
      </div>
      <p className="text-sm text-gray-700">Existencia: {product.inventory?.quantity_on_hand ?? 'Sin registrar'} · Reservadas: {product.inventory?.quantity_reserved ?? 'Sin registrar'}</p>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{notice}</p>}
      {canEdit && product.is_active && <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <p className="text-sm text-gray-700 md:col-span-2">Para iniciar existencias, registra un ajuste con la cantidad contada. El ajuste reemplaza la cantidad actual; entradas y salidas la incrementan o reducen.</p>
        <label>Tipo de movimiento<select className={inputClass} value={type} onChange={(event) => {
          const value = event.target.value;
          if (value === 'entry' || value === 'exit' || value === 'adjustment') setType(value);
        }}><option value="entry">Entrada</option><option value="exit">Salida</option><option value="adjustment">Ajuste: cantidad final</option></select></label>
        <label>Cantidad<input className={inputClass} type="number" min={type === 'adjustment' ? 0 : 1} max="2147483647" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label className="md:col-span-2">Motivo<input className={inputClass} required maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <div className="md:col-span-2"><button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">{saving ? 'Registrando...' : 'Registrar movimiento'}</button></div>
      </form>}
      {!product.is_active && <p className="text-sm text-gray-700">Este producto está inactivo; no se pueden registrar movimientos.</p>}
      <h3 className="font-semibold">Historial</h3>
      {loading ? <p>Cargando historial...</p> : history.length === 0 ? <p>{error ? 'No se pudo mostrar el historial.' : 'No hay movimientos registrados.'}</p> : (
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr>{['Fecha', 'Tipo', 'Cantidad', 'Motivo', 'Usuario'].map((title) => <th className="p-2" key={title}>{title}</th>)}</tr></thead>
          <tbody>{history.map((item) => <tr key={item.id} className="border-t">
            <td className="p-2">{new Date(item.created_at).toLocaleString('es-GT')}</td>
            <td className="p-2">{names[item.movement_type] ?? item.movement_type}</td>
            <td className="p-2">{item.quantity}</td><td className="p-2">{item.notes || '—'}</td>
            <td className="p-2">{item.actor?.full_name || '—'}</td>
          </tr>)}</tbody>
        </table></div>
      )}
      <div className="flex items-center gap-4">
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page === 1} onClick={() => { setError(''); setLoading(true); setPage(page - 1); }}>Anterior</button>
        <span>Página {page} · {count} movimientos</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page * 25 >= count} onClick={() => { setError(''); setLoading(true); setPage(page + 1); }}>Siguiente</button>
      </div>
    </section>
  );
}
