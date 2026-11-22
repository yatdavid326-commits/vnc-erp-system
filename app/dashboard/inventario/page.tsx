'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import InventarioForm from '@/components/inventario/InventarioForm';
import InventarioTable from '@/components/inventario/InventarioTable';
import StockAlerts from '@/components/inventario/StockAlerts';
import { Producto } from '@/lib/services/products/productService';
import { useToast } from '@/components/notifications/ToastProvider';

async function loadProductos(page: number, limit: number, search: string, status: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(status && { status }),
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
  const { showToast } = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [movementProduct, setMovementProduct] = useState<Producto | null>(null);
  const [movementType, setMovementType] = useState<'entry' | 'exit' | 'adjustment'>('entry');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [movementRequestId, setMovementRequestId] = useState(() => crypto.randomUUID());
  const [savingMovement, setSavingMovement] = useState(false);
  const fetchProductos = useCallback(async () => {
    try {
      setError('');
      const { productos: data, total: productCount } = await loadProductos(
        page,
        limit,
        search,
        status
      );
      setProductos(data);
      setTotal(productCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, page, search, status]);

  useEffect(() => {
    let active = true;
    loadProductos(page, limit, search, status)
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
  }, [page, limit, search, status]);

  const handleCreate = async (formData: Partial<Producto>) => {
    try {
      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create product');

      showToast('Producto creado correctamente.', 'success');
      setShowForm(false);
      await fetchProductos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo crear el producto.', 'error');
      throw err;
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
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update product');

      showToast('Producto actualizado correctamente.', 'success');
      setShowForm(false);
      setEditingId(null);
      await fetchProductos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo actualizar el producto.', 'error');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/inventario/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete product');

      showToast('Producto eliminado correctamente.', 'success');
      await fetchProductos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo eliminar el producto.', 'error');
    }
  };

  const handleMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!movementProduct) return;

    setSavingMovement(true);
    setError('');
    try {
      const response = await fetch(`/api/inventario/${movementProduct.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: movementRequestId,
          type: movementType,
          quantity: Number(movementQuantity),
          notes: movementNotes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar el movimiento.');

      showToast('Movimiento de inventario registrado.', 'success');
      setMovementProduct(null);
      setMovementQuantity('');
      setMovementNotes('');
      setMovementRequestId(crypto.randomUUID());
      await fetchProductos();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'No se pudo registrar el movimiento.',
        'error'
      );
    } finally {
      setSavingMovement(false);
    }
  };

  const openMovementForm = (producto: Producto) => {
    setMovementProduct(producto);
    setMovementType('entry');
    setMovementQuantity('');
    setMovementNotes('');
    setMovementRequestId(crypto.randomUUID());
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

        {movementProduct && (
          <form onSubmit={handleMovement} className="mb-6 grid gap-4 rounded-lg border bg-white p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold">Movimiento de stock: {movementProduct.nombre}</h2>
              <p className="text-sm text-gray-600">
                Existencia actual: {movementProduct.cantidad_stock} · Reservada: {movementProduct.cantidad_reservada}
              </p>
            </div>
            <label className="text-sm font-medium">
              Tipo
              <select
                value={movementType}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'entry' || value === 'exit' || value === 'adjustment') setMovementType(value);
                }}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="entry">Entrada</option>
                <option value="exit">Salida</option>
                <option value="adjustment">Ajuste (cantidad final)</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Cantidad
              <input
                type="number"
                required
                min={movementType === 'adjustment' ? 0 : 1}
                max={2147483647}
                step="1"
                value={movementQuantity}
                onChange={(event) => setMovementQuantity(event.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Motivo
              <input
                type="text"
                required
                maxLength={500}
                value={movementNotes}
                onChange={(event) => setMovementNotes(event.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </label>
            <div className="flex gap-2 md:col-span-2">
              <button disabled={savingMovement} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" type="submit">
                {savingMovement ? 'Registrando...' : 'Registrar movimiento'}
              </button>
              <button disabled={savingMovement} className="rounded border px-4 py-2" type="button" onClick={() => setMovementProduct(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Stock Alerts */}
        <StockAlerts productos={productos} />

        {/* Search */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            placeholder="Buscar por nombre, SKU o descripción..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
          />
          <select
            aria-label="Filtrar productos por estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <InventarioTable
            productos={productos}
            onEdit={handleEdit}
            onMovement={openMovementForm}
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
