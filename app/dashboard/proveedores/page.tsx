'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useModuleStore } from '@/hooks';
import { supabase } from '@/lib/db/supabase';
import { emptySupplier, type Supplier, type SupplierInput } from '@/lib/suppliers';

async function supplierRequest(path: string, method = 'GET', body?: SupplierInput) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Error al consultar proveedores (${response.status}).`);
  return result;
}

const fields = [
  { key: 'name', label: 'Nombre', maxLength: 200, required: true },
  { key: 'contact_person', label: 'Persona de contacto', maxLength: 200 },
  { key: 'email', label: 'Correo electrónico', maxLength: 254, type: 'email' },
  { key: 'phone', label: 'Teléfono', maxLength: 50 },
  { key: 'nit_number', label: 'NIT', maxLength: 50 },
  { key: 'address', label: 'Dirección', maxLength: 300 },
  { key: 'city', label: 'Ciudad', maxLength: 100 },
  { key: 'country', label: 'País', maxLength: 100 },
  { key: 'payment_terms', label: 'Condiciones de pago', maxLength: 200 },
] as const;

export default function ProveedoresPage() {
  const access = useModuleStore((state) => state.userModules.find(
    (item) => item.module?.name === 'suppliers' && item.module.is_active && item.can_view
  ));
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [form, setForm] = useState<SupplierInput>(emptySupplier);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), ...filters });
    supplierRequest(`/api/proveedores?${params}`).then((result) => {
      if (active) { setSuppliers(result.data); setCount(result.count); }
    }).catch((err) => {
      if (active) {
        setSuppliers([]);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, filters]);

  function refresh() { setLoading(true); setRevision((value) => value + 1); }
  function applyFilters(search: string, status: string) {
    setError(''); setNotice(''); setLoading(true); setPage(1);
    setFilters({ search: search.trim(), status });
  }
  function edit(supplier: Supplier) {
    setForm({
      name: supplier.name, contact_person: supplier.contact_person ?? '', email: supplier.email ?? '',
      phone: supplier.phone ?? '', nit_number: supplier.nit_number ?? '', address: supplier.address ?? '',
      city: supplier.city ?? '', country: supplier.country ?? '', payment_terms: supplier.payment_terms ?? '',
      is_active: supplier.is_active ?? false,
    });
    setEditing(supplier.id); setShowForm(true); setError(''); setNotice('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await supplierRequest(editing ? `/api/proveedores/${editing}` : '/api/proveedores', editing ? 'PUT' : 'POST', form);
      setShowForm(false); setEditing(null); setForm(emptySupplier);
      setNotice(editing ? 'Proveedor actualizado.' : 'Proveedor creado.');
      if (!editing && page !== 1) { setLoading(true); setPage(1); } else refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor.');
    } finally { setSaving(false); }
  }
  async function remove(supplier: Supplier) {
    if (!window.confirm(`¿Eliminar a ${supplier.name}? Esta acción no se puede deshacer.`)) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await supplierRequest(`/api/proveedores/${supplier.id}`, 'DELETE');
      setNotice('Proveedor eliminado.');
      if (page > 1 && suppliers.length === 1) { setLoading(true); setPage(page - 1); } else refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el proveedor.');
    } finally { setSaving(false); }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
        {access?.can_create && <button className="rounded bg-blue-600 px-4 py-2 text-white" disabled={saving} onClick={() => {
          setForm(emptySupplier); setEditing(null); setShowForm(true); setError(''); setNotice('');
        }}>Nuevo proveedor</button>}
      </div>
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
        <h2 className="text-xl font-semibold md:col-span-2">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
        {fields.map((field) => <label key={field.key}>{field.label}{'required' in field && field.required ? ' *' : ''}
          <input className={inputClass} type={'type' in field ? field.type : 'text'} required={'required' in field && field.required}
            maxLength={field.maxLength} value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />
        </label>)}
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Proveedor activo</label>
        <div className="flex gap-3 md:col-span-2">
          <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">{saving ? 'Guardando...' : 'Guardar'}</button>
          <button disabled={saving} className="rounded border px-4 py-2" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
        </div>
      </form>}
      <div className="overflow-x-auto rounded bg-white shadow-sm">
        {loading ? <p className="p-5">Cargando proveedores...</p> : suppliers.length === 0 ? <p className="p-5">{error ? 'No se pudo mostrar la lista.' : filters.search || filters.status !== 'all' ? 'No hay proveedores que coincidan con los filtros.' : 'No hay proveedores registrados.'}</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50"><tr>{['Nombre', 'Contacto', 'NIT', 'Teléfono', 'Estado', 'Acciones'].map((title) => <th className="p-3" key={title}>{title}</th>)}</tr></thead>
            <tbody>{suppliers.map((supplier) => <tr key={supplier.id} className="border-t">
              <td className="p-3">{supplier.name}</td><td className="p-3">{supplier.contact_person || '—'}</td>
              <td className="p-3">{supplier.nit_number || '—'}</td><td className="p-3">{supplier.phone || '—'}</td>
              <td className="p-3">{supplier.is_active ? 'Activo' : 'Inactivo'}</td>
              <td className="p-3"><div className="flex gap-3">
                {access?.can_edit && <button disabled={saving} className="text-blue-700" onClick={() => edit(supplier)}>Editar</button>}
                {access?.can_delete && <button disabled={saving} className="text-red-700" onClick={() => void remove(supplier)}>Eliminar</button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page === 1} onClick={() => { setError(''); setLoading(true); setPage(page - 1); }}>Anterior</button>
        <span>Página {page} · {count} proveedores</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page * 25 >= count} onClick={() => { setError(''); setLoading(true); setPage(page + 1); }}>Siguiente</button>
      </div>
    </div>
  );
}
