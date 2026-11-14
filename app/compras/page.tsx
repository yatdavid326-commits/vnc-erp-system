'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Compra {
  id: string;
  numero_recibo: string;
  proveedor_id: string;
  fecha: string;
  total: number;
  estado: string;
  created_at: string;
}

export default function ComprasPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    numero_recibo: '',
    proveedor_id: '',
    fecha: new Date().toISOString().split('T')[0],
    total: 0,
    estado: 'pendiente',
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchCompras();
  }, [session, router]);

  const fetchCompras = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/compras');
      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setCompras(data);
      setError('');
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/compras/${editingId}` : '/api/compras';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error');
      await fetchCompras();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        numero_recibo: '',
        proveedor_id: '',
        fecha: new Date().toISOString().split('T')[0],
        total: 0,
        estado: 'pendiente',
      });
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro?')) return;
    try {
      await fetch(`/api/compras/${id}`, { method: 'DELETE' });
      await fetchCompras();
    } catch (err) {
      setError('Error');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Recibos de Compras</h1>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            {showForm ? 'Cancelar' : 'Nuevo Recibo'}
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="# Recibo" required value={formData.numero_recibo} onChange={(e) => setFormData({ ...formData, numero_recibo: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="text" placeholder="Proveedor ID" required value={formData.proveedor_id} onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="date" required value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="number" placeholder="Total" step="0.01" value={formData.total} onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) })} className="px-3 py-2 border rounded-md" />
              <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="px-3 py-2 border rounded-md">
                <option value="pendiente">Pendiente</option>
                <option value="recibido">Recibido</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <button type="submit" className="col-span-2 bg-green-600 text-white px-4 py-2 rounded-lg">Guardar</button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100"><tr><th className="px-6 py-3 text-left"># Recibo</th><th className="px-6 py-3 text-left">Proveedor</th><th className="px-6 py-3 text-left">Fecha</th><th className="px-6 py-3 text-left">Total</th><th className="px-6 py-3 text-left">Estado</th><th className="px-6 py-3 text-left">Acciones</th></tr></thead>
              <tbody>
                {compras.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay compras</td></tr>
                ) : (
                  compras.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="px-6 py-4 text-sm">{c.numero_recibo}</td>
                      <td className="px-6 py-4 text-sm">{c.proveedor_id}</td>
                      <td className="px-6 py-4 text-sm">{c.fecha}</td>
                      <td className="px-6 py-4 text-sm">${c.total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm"><span className="bg-yellow-100 px-2 py-1 rounded text-xs">{c.estado}</span></td>
                      <td className="px-6 py-4 text-sm space-x-2"><button onClick={() => handleDelete(c.id)} className="bg-red-600 text-white px-3 py-1 rounded text-xs">Eliminar</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
