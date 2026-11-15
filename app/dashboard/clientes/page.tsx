'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useModuleStore } from '@/hooks';
import { supabase } from '@/lib/db/supabase';
import { emptyCustomer, type Customer, type CustomerInput } from '@/lib/customers';

async function customerRequest(path: string, method = 'GET', body?: CustomerInput) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('No se pudo obtener la sesión. Inicia sesión nuevamente.');
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Error al consultar clientes (${response.status}).`);
  return result;
}

export default function ClientesPage() {
  const access = useModuleStore((state) => state.userModules.find(
    (item) => item.module?.name === 'clients' && item.module.is_active && item.can_view
  ));
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [form, setForm] = useState<CustomerInput>(emptyCustomer);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), ...filters });
    customerRequest(`/api/clientes?${params}`).then((result) => {
      if (active) {
        setCustomers(result.data);
        setCount(result.count);
      }
    }).catch((err) => {
      if (active) {
        setCustomers([]);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, filters]);

  function refresh() {
    setLoading(true);
    setRevision((value) => value + 1);
  }

  function applyFilters(search: string, status: string) {
    setError('');
    setNotice('');
    setLoading(true);
    setPage(1);
    setFilters({ search: search.trim(), status });
  }

  function edit(customer: Customer) {
    setForm({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      nit_number: customer.nit_number ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      country: customer.country ?? '',
      customer_type: customer.customer_type ?? 'retail',
      is_active: customer.is_active ?? false,
    });
    setEditing(customer.id);
    setShowForm(true);
    setError('');
    setNotice('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await customerRequest(editing ? `/api/clientes/${editing}` : '/api/clientes', editing ? 'PUT' : 'POST', form);
      setShowForm(false);
      setEditing(null);
      setForm(emptyCustomer);
      setNotice(editing ? 'Cliente actualizado.' : 'Cliente creado.');
      if (!editing && page !== 1) { setLoading(true); setPage(1); }
      else refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(customer: Customer) {
    if (!window.confirm(`¿Eliminar a ${customer.name}? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await customerRequest(`/api/clientes/${customer.id}`, 'DELETE');
      setNotice('Cliente eliminado.');
      if (page > 1 && customers.length === 1) { setLoading(true); setPage(page - 1); }
      else refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el cliente.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        {access?.can_create && <button className="rounded bg-blue-600 px-4 py-2 text-white" disabled={saving} onClick={() => {
          setForm(emptyCustomer); setEditing(null); setShowForm(true); setError(''); setNotice('');
        }}>Nuevo cliente</button>}
      </div>
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{notice}</p>}
      <form className="flex flex-wrap items-end gap-3 rounded bg-white p-4 shadow-sm" onSubmit={(event) => {
        event.preventDefault();
        applyFilters(searchInput, statusInput);
      }}>
        <label className="min-w-48 flex-1">Buscar por nombre
          <input className={inputClass} type="search" maxLength={100} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
        </label>
        <label>Estado
          <select className={inputClass} value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
            <option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
          </select>
        </label>
        <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white">Buscar</button>
        <button type="button" disabled={saving} className="rounded border px-4 py-2" onClick={() => {
          setSearchInput(''); setStatusInput('all'); applyFilters('', 'all');
        }}>Limpiar filtros</button>
      </form>
      {showForm && (
        <form onSubmit={submit} className="grid gap-4 rounded bg-white p-5 shadow-sm md:grid-cols-2">
          <h2 className="text-xl font-semibold md:col-span-2">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <label>Nombre *<input className={inputClass} required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Correo electrónico<input className={inputClass} type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Teléfono<input className={inputClass} maxLength={50} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>NIT<input className={inputClass} maxLength={50} value={form.nit_number} onChange={(e) => setForm({ ...form, nit_number: e.target.value })} /></label>
          <label>Dirección<input className={inputClass} maxLength={300} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>Ciudad<input className={inputClass} maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          <label>País<input className={inputClass} maxLength={100} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
          <label>Tipo<select className={inputClass} value={form.customer_type} onChange={(e) => {
            const value = e.target.value;
            if (value === 'retail' || value === 'wholesale' || value === 'business') setForm({ ...form, customer_type: value });
          }}><option value="retail">Minorista</option><option value="wholesale">Mayorista</option><option value="business">Empresa</option></select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Cliente activo</label>
          <div className="flex gap-3 md:col-span-2">
            <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">{saving ? 'Guardando...' : 'Guardar'}</button>
            <button disabled={saving} className="rounded border px-4 py-2" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded bg-white shadow-sm">
        {loading ? <p className="p-5">Cargando clientes...</p> : customers.length === 0 ? <p className="p-5">{error ? 'No se pudo mostrar la lista.' : filters.search || filters.status !== 'all' ? 'No hay clientes que coincidan con los filtros.' : 'No hay clientes registrados.'}</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50"><tr>{['Nombre', 'NIT', 'Teléfono', 'Correo', 'Estado', 'Acciones'].map((title) => <th className="p-3" key={title}>{title}</th>)}</tr></thead>
            <tbody>{customers.map((customer) => <tr key={customer.id} className="border-t">
              <td className="p-3">{customer.name}</td><td className="p-3">{customer.nit_number || '—'}</td>
              <td className="p-3">{customer.phone || '—'}</td><td className="p-3">{customer.email || '—'}</td>
              <td className="p-3">{customer.is_active ? 'Activo' : 'Inactivo'}</td>
              <td className="p-3"><div className="flex gap-3">
                {access?.can_edit && <button disabled={saving} className="text-blue-700" onClick={() => edit(customer)}>Editar</button>}
                {access?.can_delete && <button disabled={saving} className="text-red-700" onClick={() => void remove(customer)}>Eliminar</button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page === 1} onClick={() => { setError(''); setLoading(true); setPage(page - 1); }}>Anterior</button>
        <span>Página {page} · {count} clientes</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={loading || saving || page * 25 >= count} onClick={() => { setError(''); setLoading(true); setPage(page + 1); }}>Siguiente</button>
      </div>
    </div>
  );
}
