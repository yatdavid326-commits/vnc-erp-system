'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Producto {
  id: string;
  nombre: string;
  sku: string;
  descripcion: string;
  cantidad: number;
  cantidad_minima: number;
  precio_costo: number;
  precio_venta: number;
  categoria: string;
  estado: string;
  created_at: string;
}

export default function InventarioPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    sku: '',
    descripcion: '',
    cantidad: 0,
    cantidad_minima: 0,
    precio_costo: 0,
    precio_venta: 0,
    categoria: '',
    estado: 'activo',
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchProductos();
  }, [session, router]);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventario');
      if (!response.ok) throw new Error('Error al cargar inventario');
      const data = await response.json();
      setProductos(data);
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
      const url = editingId ? `/api/inventario/${editingId}` : '/api/inventario';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al guardar');

      await fetchProductos();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombre: '',
        sku: '',
        descripcion: '',
        cantidad: 0,
        cantidad_minima: 0,
        precio_costo: 0,
        precio_venta: 0,
        categoria: '',
        estado: 'activo',
      });
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleEdit = (producto: Producto) => {
    setFormData({
      nombre: producto.nombre,
      sku: producto.sku,
      descripcion: producto.descripcion,
      cantidad: producto.cantidad,
      cantidad_minima: producto.cantidad_minima,
      precio_costo: producto.precio_costo,
      precio_venta: producto.precio_venta,
      categoria: producto.categoria,
      estado: producto.estado,
    });
    setEditingId(producto.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro?')) return;
    try {
      const response = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar');
      await fetchProductos();
    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : ''));
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancelar' : 'Nuevo Producto'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nombre"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="SKU"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Descripción"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="px-3 py-2 border rounded-md col-span-2"
              />
              <input
                type="number"
                placeholder="Cantidad"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Cantidad Mínima"
                value={formData.cantidad_minima}
                onChange={(e) => setFormData({ ...formData, cantidad_minima: parseInt(e.target.value) })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Precio Costo"
                step="0.01"
                value={formData.precio_costo}
                onChange={(e) => setFormData({ ...formData, precio_costo: parseFloat(e.target.value) })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Precio Venta"
                step="0.01"
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Categoría"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="px-3 py-2 border rounded-md"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
              <button
                type="submit"
                className="col-span-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
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
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">SKU</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Cantidad</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Precio Venta</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No hay productos
                    </td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{p.nombre}</td>
                      <td className="px-6 py-4 text-sm">{p.sku}</td>
                      <td className="px-6 py-4 text-sm">{p.cantidad}</td>
                      <td className="px-6 py-4 text-sm">${p.precio_venta.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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
