'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import InventarioForm from '@/components/inventario/InventarioForm';
import InventarioTable from '@/components/inventario/InventarioTable';
import StockAlerts from '@/components/inventario/StockAlerts';
import { Producto } from '@/lib/services/products/productService';

async function loadProductos(page: number, limit: number, search: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });
  const response = await fetch(`/api/inventario?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) throw new Error('Failed to fetch products');

  const productos: Producto[] = await response.json();
  return {
    productos,
    total: Number.parseInt(response.headers.get('X-Total-Count') || '0'),
  };
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const fetchProductos = useCallback(async () => {
    try {
      setError('');
      const { productos: data, total: productCount } = await loadProductos(
        page,
        limit,
        search
      );
      setProductos(data);
      setTotal(productCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, page, search]);

  useEffect(() => {
    let active = true;
    loadProductos(page, limit, search)
      .then(({ productos: data, total: productCount }) => {
        if (active) {
          setProductos(data);
          setTotal(productCount);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, limit, search]);

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

      setShowForm(false);
      setEditingId(null);
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
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {showForm ? 'Cancelar' : '+ Nuevo Producto'}
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
            key={editingId ?? 'new'}
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
            placeholder="Buscar por nombre, SKU o descripción..."
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
              Página {page} de {totalPages} • Total: {total} productos
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
