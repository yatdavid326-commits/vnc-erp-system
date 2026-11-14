'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Proveedor {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  contacto: string;
  ruc: string;
  estado: string;
  created_at: string;
}

export default function ProveedoresPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    contacto: '',
    ruc: '',
    estado: 'activo',
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchProveedores();
  }, [session, router]);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proveedores');
      if (!response.ok) throw new Error('Error al cargar');
      const data = await response.json();
      setProveedores(data);
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
      const url = editingId ? `/api/proveedores/${editingId}` : '/api/proveedores';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al guardar');

      await fetchProveedores();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        contacto: '',
        ruc: '',
        estado: 'activo',
      });
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setFormData({
      nombre: proveedor.nombre,
      email: proveedor.email,
      telefono: proveedor.telefono,
      direccion: proveedor.direccion,
      ciudad: proveedor.ciudad,
      contacto: proveedor.contacto,
      ruc: proveedor.ruc,
      estado: proveedor.estado,
    });
    setEditingId(proveedor.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro?')) return;
    try {
      const response = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error');
      await fetchProveedores();
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestión de Proveedores</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancelar' : 'Nuevo Proveedor'}
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Proveedor</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Nombre" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="tel" placeholder="Teléfono" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="text" placeholder="RUC" value={formData.ruc} onChange={(e) => setFormData({ ...formData, ruc: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="text" placeholder="Dirección" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="px-3 py-2 border rounded-md col-span-2" />
              <input type="text" placeholder="Ciudad" value={formData.ciudad} onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })} className="px-3 py-2 border rounded-md" />
              <input type="text" placeholder="Contacto" value={formData.contacto} onChange={(e) => setFormData({ ...formData, contacto: e.target.value })} className="px-3 py-2 border rounded-md" />
              <button type="submit" className="col-span-2 bg-green-600 text-white px-4 py-2 rounded-lg">Guardar</button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100"><tr><th className="px-6 py-3 text-left">Nombre</th><th className="px-6 py-3 text-left">Email</th><th className="px-6 py-3 text-left">Teléfono</th><th className="px-6 py-3 text-left">RUC</th><th className="px-6 py-3 text-left">Acciones</th></tr></thead>
              <tbody>
                {proveedores.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay proveedores</td></tr>
                ) : (
                  proveedores.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{p.nombre}</td>
                      <td className="px-6 py-4 text-sm">{p.email}</td>
                      <td className="px-6 py-4 text-sm">{p.telefono}</td>
                      <td className="px-6 py-4 text-sm">{p.ruc}</td>
                      <td className="px-6 py-4 text-sm space-x-2"><button onClick={() => handleEdit(p)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Editar</button><button onClick={() => handleDelete(p.id)} className="bg-red-600 text-white px-3 py-1 rounded text-xs">Eliminar</button></td>
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
