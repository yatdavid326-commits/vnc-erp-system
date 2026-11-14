'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks';
import { useRouter } from 'next/navigation';
import ProveedoresForm from '@/components/proveedores/ProveedoresForm';
import ProveedoresTable from '@/components/proveedores/ProveedoresTable';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Proveedor {
  id: string;
  nombre: string;
  email: string;
  teléfono: string;
  persona_contacto: string;
  dirección: string;
  ciudad: string;
  estado: string;
  país: string;
  términos_pago: string;
  activo: boolean;
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
    teléfono: '',
    persona_contacto: '',
    dirección: '',
    ciudad: '',
    estado: '',
    país: 'Guatemala',
    términos_pago: '',
    activo: true,
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
      if (!response.ok) throw new Error('Error al cargar proveedores');
      const data = await response.json();
      setProveedores(data);
      setError('');
    } catch (err) {
      setError('Error al cargar proveedores: ' + (err instanceof Error ? err.message : ''));
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

      if (!response.ok) throw new Error('Error al guardar proveedor');

      await fetchProveedores();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombre: '',
        email: '',
        teléfono: '',
        persona_contacto: '',
        dirección: '',
        ciudad: '',
        estado: '',
        país: 'Guatemala',
        términos_pago: '',
        activo: true,
      });
    } catch (err) {
      setError('Error al guardar: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setFormData({
      nombre: proveedor.nombre,
      email: proveedor.email,
      teléfono: proveedor.teléfono,
      persona_contacto: proveedor.persona_contacto,
      dirección: proveedor.dirección,
      ciudad: proveedor.ciudad,
      estado: proveedor.estado,
      país: proveedor.país,
      términos_pago: proveedor.términos_pago,
      activo: proveedor.activo,
    });
    setEditingId(proveedor.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este proveedor?')) return;

    try {
      const response = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar proveedor');
      await fetchProveedores();
    } catch (err) {
      setError('Error al eliminar: ' + (err instanceof Error ? err.message : ''));
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Proveedores</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                nombre: '',
                email: '',
                teléfono: '',
                persona_contacto: '',
                dirección: '',
                ciudad: '',
                estado: '',
                país: 'Guatemala',
                términos_pago: '',
                activo: true,
              });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancelar' : 'Nuevo Proveedor'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {showForm && (
          <ProveedoresForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            editingId={editingId}
          />
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-gray-500">Cargando proveedores...</p>
          </div>
        ) : (
          <ProveedoresTable
            proveedores={proveedores}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
