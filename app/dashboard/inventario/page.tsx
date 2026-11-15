'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useModuleStore } from '@/hooks';
import { supabase } from '@/lib/db/supabase';
import { emptyProduct, type Product, type ProductInput } from '@/lib/products';
import Movimientos from '@/components/inventario/Movimientos';

async function productRequest(path: string, method = 'GET', body?: ProductInput) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Error al consultar productos (${response.status}).`);
  return result;
}

const fields = [
  { key: 'product_code', label: 'Código', maxLength: 80, required: true },
  { key: 'name', label: 'Nombre', maxLength: 200, required: true },
  { key: 'description', label: 'Descripción', maxLength: 1000 },
  { key: 'unit_of_measure', label: 'Unidad de medida', maxLength: 50, required: true },
  { key: 'cost_price', label: 'Precio de costo', type: 'number', step: '0.01', max: '9999999999.99', required: true },
  { key: 'selling_price', label: 'Precio de venta', type: 'number', step: '0.01', max: '9999999999.99', required: true },
  { key: 'reorder_level', label: 'Nivel de reposición', type: 'number', step: '1', max: '2147483647', required: true },
] as const;

export default function InventarioPage() {
  const access = useModuleStore((state) => state.userModules.find(
    (item) => item.module?.name === 'inventory' && item.module.is_active && item.can_view
  ));
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState('all');
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [movementProductId, setMovementProductId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), ...filters });
    productRequest(`/api/inventario?${params}`).then((result) => {
      if (active) { setProducts(result.data); setCount(result.count); }
    }).catch((err) => {
      if (active) {
        setProducts([]);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, filters]);

  function refresh() { setLoading(true); setRevision((value) => value + 1); }
  function applyFilters(search: string, status: string) {
    setError(''); setNotice(''); setLoading(true); setPage(1);
    setFilters({ search: search.trim(), status });
  }
  function edit(product: Product) {
    setForm({
      product_code: product.product_code, name: product.name, description: product.description ?? '',
      unit_of_measure: product.unit_of_measure ?? 'unidad', cost_price: String(product.cost_price),
      selling_price: String(product.selling_price), reorder_level: String(product.reorder_level ?? 0),
      is_active: product.is_active ?? false,
    });
    setEditing(product.id); setShowForm(true); setError(''); setNotice('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const input: ProductInput = {
        ...form, cost_price: Number(form.cost_price), selling_price: Number(form.selling_price),
        reorder_level: Number(form.reorder_level),
      };
      await productRequest(editing ? `/api/inventario/${editing}` : '/api/inventario', editing ? 'PUT' : 'POST', input);
      setShowForm(false); setEditing(null); setForm(emptyProduct);
      setNotice(editing ? 'Producto actualizado.' : 'Producto creado. Su existencia aún no está registrada.');
      if (!editing && page !== 1) { setLoading(true); setPage(1); } else refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally { setSaving(false); }
  }
  async function remove(product: Product) {
    if (!window.confirm(`¿Eliminar ${product.name}? Esta acción no se puede deshacer.`)) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await productRequest(`/api/inventario/${product.id}`, 'DELETE');
      setNotice('Producto eliminado.');
      if (page > 1 && products.length === 1) { setLoading(true); setPage(page - 1); } else refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
    } finally { setSaving(false); }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2';
  const movementProduct = products.find((product) => product.id === movementProductId);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        {access?.can_create && <button className="rounded bg-blue-600 px-4 py-2 text-white" disabled={saving} onClick={() => {
          setForm(emptyProduct); setEditing(null); setShowForm(true); setError(''); setNotice('');
        }}>Nuevo producto</button>}
      </div>
      <p className="text-sm text-gray-700">Las existencias se inician mediante un ajuste con la cantidad contada.</p>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{notice}</p>}
      <form className="flex flex-wrap items-end gap-3 rounded bg-white p-4 shadow-sm" onSubmit={(event) => {
        event.preventDefault(); applyFilters(searchInput, statusInput);
      }}>
        <label className="min-w-48 flex-1">Buscar por nombre
          <input className={inputClass} type="search" maxLength={100} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
        </label>
        <label>Estado<select className={inputClass} value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
          <option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
        </select></label>
        <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white">Buscar</button>
        <button type="button" disabled={saving} className="rounded border px-4 py-2" onClick={() => {
          setSearchInput(''); setStatusInput('all'); applyFilters('', 'all');
        }}>Limpiar filtros</button>
      </form>
      {showForm && <form onSubmit={submit} className="grid gap-4 rounded bg-white p-5 shadow-sm md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
        {fields.map((field) => <label key={field.key}>{field.label}{'required' in field && field.required ? ' *' : ''}
          <input className={inputClass} type={'type' in field ? field.type : 'text'} required={'required' in field && field.required}
            maxLength={'maxLength' in field ? field.maxLength : undefined} min={'type' in field ? '0' : undefined}
            max={'max' in field ? field.max : undefined} step={'step' in field ? field.step : undefined}
            value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />
        </label>)}
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Producto activo</label>
        <div className="flex gap-3 md:col-span-2">
          <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">{saving ? 'Guardando...' : 'Guardar'}</button>
          <button disabled={saving} className="rounded border px-4 py-2" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
        </div>
      </form>}
      <div className="overflow-x-auto rounded bg-white shadow-sm">
        {loading ? <p className="p-5">Cargando productos...</p> : products.length === 0 ? <p className="p-5">{error ? 'No se pudo mostrar la lista.' : filters.search || filters.status !== 'all' ? 'No hay productos que coincidan con los filtros.' : 'No hay productos registrados.'}</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50"><tr>{['Código', 'Nombre', 'Costo', 'Precio', 'Existencia', 'Estado', 'Acciones'].map((title) => <th className="p-3" key={title}>{title}</th>)}</tr></thead>
            <tbody>{products.map((product) => <tr key={product.id} className="border-t">
              <td className="p-3">{product.product_code}</td><td className="p-3">{product.name}</td>
              <td className="p-3">{Number(product.cost_price).toFixed(2)}</td><td className="p-3">{Number(product.selling_price).toFixed(2)}</td>
              <td className="p-3">{product.inventory?.quantity_on_hand ?? 'Sin registrar'}</td>
              <td className="p-3">{product.is_active ? 'Activo' : 'Inactivo'}</td>
              <td className="p-3"><div className="flex gap-3">
                <button disabled={saving} className="text-blue-700" onClick={() => setMovementProductId(product.id)}>Movimientos</button>
                {access?.can_edit && <button disabled={saving} className="text-blue-700" onClick={() => edit(product)}>Editar</button>}
                {access?.can_delete && <button disabled={saving} className="text-red-700" onClick={() => void remove(product)}>Eliminar</button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
      {movementProduct && (
        <Movimientos
          key={movementProduct.id}
          product={movementProduct}
          canEdit={!!access?.can_edit}
          onClose={() => setMovementProductId(null)}
          onUpdated={refresh}
        />
      )}
      <div className="flex items-center gap-4">
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page === 1} onClick={() => { setError(''); setLoading(true); setPage(page - 1); }}>Anterior</button>
        <span>Página {page} · {count} productos</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page * 25 >= count} onClick={() => { setError(''); setLoading(true); setPage(page + 1); }}>Siguiente</button>
      </div>
    </div>
  );
}
