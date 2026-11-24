'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { fetchPaginatedJson } from '@/lib/utils/fetchJson';
import PaginationControls from '@/components/common/PaginationControls';
import { DEFAULT_PAGE_SIZE } from '@/lib/utils/pagination';
import { useToast } from '@/components/notifications/ToastProvider';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ActionButton from '@/components/common/ActionButton';
import { Pencil, Trash2 } from 'lucide-react';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  departamento: string;
  salario: number;
  estado: string;
  created_at: string;
}

export default function EmpleadosPage() {
  const { showToast } = useToast();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cargo: '',
    departamento: '',
    salario: 0,
    estado: 'activo',
  });
  const [deleteTarget, setDeleteTarget] = useState<Empleado | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fetchEmpleados = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const result = await fetchPaginatedJson<Empleado>(`/api/empleados?${params}`, 'Error');
      setTotal(result.total);
      const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setEmpleados(result.data);
      setError('');
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchEmpleados(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchEmpleados]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/empleados/${editingId}` : '/api/empleados';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error');
      showToast(
        editingId ? 'Empleado actualizado correctamente.' : 'Empleado creado correctamente.',
        'success'
      );
      if (page === 1) await fetchEmpleados();
      else setPage(1);
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        cargo: '',
        departamento: '',
        salario: 0,
        estado: 'activo',
      });
    } catch (err) {
      showToast(
        'Error al guardar empleado: ' + (err instanceof Error ? err.message : ''),
        'error'
      );
    }
  };

  const handleEdit = (empleado: Empleado) => {
    setFormData({
      nombre: empleado.nombre,
      email: empleado.email,
      telefono: empleado.telefono,
      cargo: empleado.cargo,
      departamento: empleado.departamento,
      salario: empleado.salario,
      estado: empleado.estado,
    });
    setEditingId(empleado.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar empleado');
      showToast('Empleado eliminado correctamente.', 'success');
      setDeleteTarget(null);
      await fetchEmpleados();
    } catch (err) {
      showToast(
        'Error al eliminar empleado: ' + (err instanceof Error ? err.message : ''),
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                nombre: '',
                email: '',
                telefono: '',
                cargo: '',
                departamento: '',
                salario: 0,
                estado: 'activo',
              });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancelar' : 'Nuevo Empleado'}
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Empleado</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                />
                <input
                  type="text"
                  placeholder="Departamento"
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                />
                <input
                  type="number"
                  placeholder="Salario"
                  step="0.01"
                  value={formData.salario}
                  onChange={(e) => setFormData({ ...formData, salario: parseFloat(e.target.value) })}
                  className="px-3 py-2 border rounded-md"
                />
              </div>

              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>

              <button type="submit" className="w-full bg-green-600 text-white px-4 py-2 rounded-lg">
                Guardar
              </button>
            </form>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Buscar empleados
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre, correo o cargo"
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
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">Nombre</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Cargo</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No hay empleados
                    </td>
                  </tr>
                ) : (
                  empleados.map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{emp.nombre}</td>
                      <td className="px-6 py-4 text-sm">{emp.email}</td>
                      <td className="px-6 py-4 text-sm">{emp.cargo}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            emp.estado === 'activo'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {emp.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton title="Editar empleado" icon={<Pencil size={14} />} onClick={() => handleEdit(emp)} compact>
                            Editar
                          </ActionButton>
                          <ActionButton title="Eliminar empleado" icon={<Trash2 size={14} />} variant="delete" onClick={() => setDeleteTarget(emp)} compact>
                            Eliminar
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="mt-4">
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              itemLabel="empleados"
              disabled={loading}
              onPageChange={setPage}
            />
          </div>
        )}
        <ConfirmDialog
          open={deleteTarget !== null}
          title="Eliminar empleado"
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



