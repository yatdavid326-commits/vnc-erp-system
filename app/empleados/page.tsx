'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  departamento: string;
  salario: number;
  modulos: string[];
  estado: string;
  created_at: string;
}

export default function EmpleadosPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cargo: '',
    departamento: '',
    salario: 0,
    password: '',
    modulos: [] as string[],
    estado: 'activo',
  });

  const modulosDisponibles = [
    'dashboard',
    'clientes',
    'inventario',
    'proveedores',
    'compras',
    'pos',
    'caja',
    'reportes',
    'asistencia',
    'empleados',
  ];

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchEmpleados();
  }, [session, router]);

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/empleados');
      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setEmpleados(data);
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

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
      await fetchEmpleados();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        cargo: '',
        departamento: '',
        salario: 0,
        password: '',
        modulos: [],
        estado: 'activo',
      });
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
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
      password: '',
      modulos: empleado.modulos || [],
      estado: empleado.estado,
    });
    setEditingId(empleado.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro?')) return;
    try {
      await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
      await fetchEmpleados();
    } catch (err) {
      setError('Error');
    }
  };

  const toggleModulo = (modulo: string) => {
    setFormData({
      ...formData,
      modulos: formData.modulos.includes(modulo)
        ? formData.modulos.filter((m) => m !== modulo)
        : [...formData.modulos, modulo],
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
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
                <div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Contraseña"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="px-3 py-2 border rounded-md w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-gray-600 mt-1"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Módulos Permitidos</label>
                <div className="grid grid-cols-2 gap-2">
                  {modulosDisponibles.map((modulo) => (
                    <label key={modulo} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.modulos.includes(modulo)}
                        onChange={() => toggleModulo(modulo)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm capitalize">{modulo}</span>
                    </label>
                  ))}
                </div>
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

        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">Nombre</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Cargo</th>
                  <th className="px-6 py-3 text-left">Módulos</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
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
                        <div className="flex flex-wrap gap-1">
                          {emp.modulos?.slice(0, 3).map((mod) => (
                            <span key={mod} className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {mod}
                            </span>
                          ))}
                          {emp.modulos && emp.modulos.length > 3 && (
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                              +{emp.modulos.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
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
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Eliminar
                        </button>
                      </td>
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
