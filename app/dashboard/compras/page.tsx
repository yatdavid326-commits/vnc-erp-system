'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { fetchJson } from '@/lib/utils/fetchJson';

interface Compra {
  id: string;
  numero_po: string;
  proveedor_id: string;
  fecha_orden: string;
  monto_total: number;
  estado: string;
  fecha_entrega_esperada: string | null;
  created_at: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  activo: boolean;
}

interface PurchaseFormData {
  numero_po: string;
  proveedor_id: string;
  fecha_orden: string;
  monto_total: number;
  estado: string;
}

const emptyForm = (): PurchaseFormData => ({
  numero_po: '',
  proveedor_id: '',
  fecha_orden: new Date().toISOString().slice(0, 10),
  monto_total: 0,
  estado: 'pending',
});

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PurchaseFormData>(emptyForm);

  const fetchCompras = useCallback(async () => {
    try {
      const [purchaseData, supplierData] = await Promise.all([
        fetchJson<Compra[]>('/api/compras', 'Error al cargar compras'),
        fetchJson<Proveedor[]>('/api/proveedores', 'Error al cargar proveedores'),
      ]);
      setCompras(purchaseData);
      setProveedores(supplierData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las compras.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJson<Compra[]>('/api/compras', 'Error al cargar compras'),
      fetchJson<Proveedor[]>('/api/proveedores', 'Error al cargar proveedores'),
    ])
      .then(([purchaseData, supplierData]) => {
        if (active) {
          setCompras(purchaseData);
          setProveedores(supplierData);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar las compras.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setFormData(emptyForm());
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch(editingId ? `/api/compras/${editingId}` : '/api/compras', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar la compra.');
      await fetchCompras();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la compra.');
    }
  };

  const handleEdit = (compra: Compra) => {
    setFormData({
      numero_po: compra.numero_po,
      proveedor_id: compra.proveedor_id,
      fecha_orden: compra.fecha_orden,
      monto_total: Number(compra.monto_total),
      estado: compra.estado,
    });
    setEditingId(compra.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta compra?')) return;
    try {
      const response = await fetch(`/api/compras/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar la compra.');
      await fetchCompras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la compra.');
    }
  };

  const supplierName = (id: string) =>
    proveedores.find((supplier) => supplier.id === id)?.nombre ?? 'Proveedor no disponible';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Órdenes de compra</h1>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          {showForm ? 'Cancelar' : 'Nueva orden'}
        </button>
      </div>

      {error && <div role="alert" className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {showForm && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold">{editingId ? 'Editar orden' : 'Nueva orden'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Número de orden
              <input
                type="text"
                required
                maxLength={80}
                value={formData.numero_po}
                onChange={(event) => setFormData({ ...formData, numero_po: event.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Proveedor
              <select
                required
                value={formData.proveedor_id}
                onChange={(event) => setFormData({ ...formData, proveedor_id: event.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.filter((supplier) => supplier.activo).map((supplier) => (
                  <option value={supplier.id} key={supplier.id}>{supplier.nombre}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Fecha de orden
              <input
                type="date"
                required
                value={formData.fecha_orden}
                onChange={(event) => setFormData({ ...formData, fecha_orden: event.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Total
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.monto_total}
                onChange={(event) => setFormData({ ...formData, monto_total: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Estado
              <select
                value={formData.estado}
                onChange={(event) => setFormData({ ...formData, estado: event.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
                <option value="received">Recibida</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </label>
            <button type="submit" className="self-end rounded-lg bg-green-600 px-4 py-2 text-white">
              {editingId ? 'Actualizar orden' : 'Crear orden'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Número</th>
                <th className="px-6 py-3 text-left">Proveedor</th>
                <th className="px-6 py-3 text-left">Fecha</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {compras.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay órdenes</td></tr>
              ) : compras.map((compra) => (
                <tr key={compra.id} className="border-b">
                  <td className="px-6 py-4 text-sm">{compra.numero_po}</td>
                  <td className="px-6 py-4 text-sm">{supplierName(compra.proveedor_id)}</td>
                  <td className="px-6 py-4 text-sm">{compra.fecha_orden}</td>
                  <td className="px-6 py-4 text-sm">Q {Number(compra.monto_total).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{compra.estado}</td>
                  <td className="space-x-2 px-6 py-4 text-sm">
                    <button onClick={() => handleEdit(compra)} className="rounded bg-blue-600 px-3 py-1 text-xs text-white">Editar</button>
                    <button onClick={() => handleDelete(compra.id)} className="rounded bg-red-600 px-3 py-1 text-xs text-white">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
