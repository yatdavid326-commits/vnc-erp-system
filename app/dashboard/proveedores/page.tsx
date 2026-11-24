'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { fetchPaginatedJson } from '@/lib/utils/fetchJson';
import dynamicImport from 'next/dynamic';
import { type ProveedorFormData } from '@/components/proveedores/ProveedoresForm';
const ProveedoresForm = dynamicImport(
  () => import('@/components/proveedores/ProveedoresForm'),
  { ssr: false, loading: () => <p className="py-4 text-sm text-gray-600">Cargando formulario...</p> }
);
import ProveedoresTable from '@/components/proveedores/ProveedoresTable';
import PaginationControls from '@/components/common/PaginationControls';
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/pagination';
import { useToast } from '@/components/notifications/ToastProvider';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

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
  const { showToast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProveedorFormData>({
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
  const [deleteTarget, setDeleteTarget] = useState<Proveedor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const result = await fetchPaginatedJson<Proveedor>(
        `/api/proveedores?${params}`,
        'Error al cargar proveedores'
      );
      setTotal(result.total);
      const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setProveedores(result.data);
      setError('');
    } catch (err) {
      setError('Error al cargar proveedores: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchProveedores(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchProveedores]);

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

      showToast(
        editingId ? 'Proveedor actualizado correctamente.' : 'Proveedor creado correctamente.',
        'success'
      );
      if (page === 1) await fetchProveedores();
      else setPage(1);
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
      showToast(
        'Error al guardar: ' + (err instanceof Error ? err.message : ''),
        'error'
      );
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
    setDeleting(true);
    try {
      const response = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar proveedor');
      showToast('Proveedor eliminado correctamente.', 'success');
      setDeleteTarget(null);
      await fetchProveedores();
    } catch (err) {
      showToast(
        'Error al eliminar: ' + (err instanceof Error ? err.message : ''),
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
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

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Buscar proveedores
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre, contacto o correo"
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Estado
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border px-3 py-2"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="mt-2 text-gray-500">Cargando proveedores...</p>
          </div>
        ) : (
          <div className="space-y-4 overflow-x-auto">
            <ProveedoresTable
              proveedores={proveedores}
              onEdit={handleEdit}
              onDelete={(id) => {
                const target = proveedores.find((proveedor) => proveedor.id === id) ?? null;
                setDeleteTarget(target);
              }}
            />
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              itemLabel="proveedores"
              disabled={loading}
              onPageChange={setPage}
            />
          </div>
        )}
        <ConfirmDialog
          open={deleteTarget !== null}
          title="Eliminar proveedor"
          description={deleteTarget ? `¿Eliminar a ${deleteTarget.nombre}? Esta acción no se puede deshacer.` : ''}
          confirmText="Eliminar"
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) void handleDelete(deleteTarget.id);
          }}
        />
      </div>
    );
}



