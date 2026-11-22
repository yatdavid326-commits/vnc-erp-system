'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { fetchJson } from '@/lib/utils/fetchJson';
import ClientesForm, { type ClienteFormData } from '@/components/clientes/ClientesForm';
import ClientesTable from '@/components/clientes/ClientesTable';

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  tipo: string;
  estado_cliente: string;
  created_at: string;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigo_postal: '',
    tipo: 'retail',
    estado_cliente: 'activo',
  });
  const fetchClientes = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const data = await fetchJson<Cliente[]>(
        `/api/clientes?${params}`,
        'Error al cargar clientes'
      );
      setClientes(data);
      setError('');
    } catch (err) {
      setError('Error al cargar clientes: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchClientes(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchClientes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/clientes/${editingId}` : '/api/clientes';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al guardar cliente');

      await fetchClientes();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        estado: '',
        codigo_postal: '',
        tipo: 'retail',
        estado_cliente: 'activo',
      });
    } catch (err) {
      setError('Error al guardar: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      ciudad: cliente.ciudad,
      estado: cliente.estado,
      codigo_postal: cliente.codigo_postal,
      tipo: cliente.tipo,
      estado_cliente: cliente.estado_cliente,
    });
    setEditingId(cliente.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este cliente?')) return;

    try {
      const response = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar cliente');
      await fetchClientes();
    } catch (err) {
      setError('Error al eliminar: ' + (err instanceof Error ? err.message : ''));
    }
  };

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                nombre: '',
                email: '',
                telefono: '',
                direccion: '',
                ciudad: '',
                estado: '',
                codigo_postal: '',
                tipo: 'retail',
                estado_cliente: 'activo',
              });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancelar' : 'Nuevo Cliente'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {showForm && (
          <ClientesForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            editingId={editingId}
          />
        )}

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Buscar clientes
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, correo o teléfono"
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-gray-500">Cargando clientes...</p>
          </div>
        ) : (
          <ClientesTable
            clientes={clientes}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
  );
}


