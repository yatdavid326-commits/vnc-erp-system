'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks';
import { useRouter } from 'next/navigation';

import InventarioForm from '@/components/inventario/InventarioForm';
import InventarioTable from '@/components/inventario/InventarioTable';
import StockAlerts from '@/components/inventario/StockAlerts';
import { Producto } from '@/lib/services/products/productService';

export default function InventarioPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchProductos();
  }, [session, router, page, search]);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      const res = await fetch(`/api/inventario?${params}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to fetch products');

      const data = await res.json();
      setProductos(data);
      setTotal(parseInt(res.headers.get('X-Total-Count') || '0'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData: Partial<Producto>) => {
    try {
      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create product');

      setShowForm(false);
      fetchProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleUpdate = async (formData: Partial<Producto>) => {
    if (!editingId) return;

    try {
      const res = await fetch(`/api/inventario/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update product');

      setEditingId(null);
      setShowForm(false);
      fetchProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/inventario/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete product');

      fetchProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (producto: Producto) => {
    setEditingId(producto.id);
    setShowForm(true);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const editingProducto = editingId
    ? productos.find(p => p.id === editingId)
    : undefined;

  const totalPages = Math.ceil(total / limit);

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {showForm ? 'Cancel' : '+ New Product'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <InventarioForm
            producto={editingProducto}
            onSubmit={editingId ? handleUpdate : handleCreate}
            onCancel={handleFormCancel}
            loading={loading}
          />
        )}

        {/* Stock Alerts */}
        <StockAlerts productos={productos} />

        {/* Search */}
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by name, SKU, or description..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <InventarioTable
            productos={productos}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} • Total: {total} products
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    );
}
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
    );
}



